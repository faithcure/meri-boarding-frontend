// @ts-nocheck
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import type { RouteContext } from './context.js';

export async function registerAuthUserRoutes(ctx: RouteContext) {
  const {
    server,
    getDb,
    verifyPassword,
    createToken,
    getAdminDisplayName,
    toAvatarUrl,
    hashPassword,
    ObjectId,
    getRequestAdmin,
    parseDataUrl,
    sanitizeFilename,
    saveUploadedImage,
    avatarUploadDir,
  } = ctx;

server.post('/api/v1/auth/login', async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!email || !password) {
    return reply.code(400).send({ error: 'Email and password are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const admin = await admins.findOne({ email });

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const isApproved = admin.approved ?? true;
  if (!isApproved || !admin.active) {
    return reply.code(403).send({ error: 'Your account is pending admin approval.' });
  }

  const token = createToken({ userId: admin._id.toHexString(), role: admin.role });
  return reply.send({
    token,
    admin: {
      id: admin._id.toHexString(),
      email: admin.email,
      name: getAdminDisplayName(admin),
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      phone: admin.phone || '',
      avatarUrl: toAvatarUrl(admin.avatarPath),
      role: admin.role,
      active: admin.active,
      approved: admin.approved ?? false,
    },
  });
});

server.post('/api/v1/auth/register', async (request, reply) => {
  const body = request.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!firstName || !lastName || !email || !password) {
    return reply.code(400).send({ error: 'First name, last name, email and password are required' });
  }

  if (password.length < 6) {
    return reply.code(400).send({ error: 'Password must be at least 6 characters' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const hasSuperAdmin = (await admins.countDocuments({ role: 'super_admin', active: true }, { limit: 1 })) > 0;
  const role: AdminRole = hasSuperAdmin ? 'user' : 'super_admin';
  const approved = !hasSuperAdmin;
  const active = !hasSuperAdmin;

  try {
    const now = new Date();
    await admins.insertOne({
      _id: new ObjectId(),
      email,
      firstName,
      lastName,
      phone,
      name: `${firstName} ${lastName}`.trim(),
      passwordHash: hashPassword(password),
      role,
      approved,
      active,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return reply.code(409).send({ error: 'This email is already registered' });
  }

  if (!hasSuperAdmin) {
    return reply.code(201).send({ ok: true, message: 'First account created as super_admin.' });
  }

  return reply.code(201).send({ ok: true, message: 'Registration submitted. Wait for admin approval.' });
});

server.get('/api/v1/auth/me', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  return reply.send({
    admin: {
      id: admin._id.toHexString(),
      email: admin.email,
      name: getAdminDisplayName(admin),
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      phone: admin.phone || '',
      avatarUrl: toAvatarUrl(admin.avatarPath),
      role: admin.role,
      active: admin.active,
      approved: admin.approved ?? false,
    },
  });
});

server.patch('/api/v1/auth/me', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { firstName?: string; lastName?: string; phone?: string } | undefined;
  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!firstName || !lastName) {
    return reply.code(400).send({ error: 'First name and last name are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const now = new Date();
  const name = `${firstName} ${lastName}`.trim();

  await admins.updateOne(
    { _id: admin._id },
    {
      $set: {
        firstName,
        lastName,
        phone,
        name,
        updatedAt: now,
      },
    },
  );

  const updated = await admins.findOne({ _id: admin._id });
  if (!updated) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return reply.send({
    ok: true,
    admin: {
      id: updated._id.toHexString(),
      email: updated.email,
      name: getAdminDisplayName(updated),
      firstName: updated.firstName || '',
      lastName: updated.lastName || '',
      phone: updated.phone || '',
      avatarUrl: toAvatarUrl(updated.avatarPath),
      role: updated.role,
      active: updated.active,
      approved: updated.approved ?? false,
    },
  });
});

server.post('/api/v1/auth/me/avatar', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const dataUrl = String(body?.dataUrl || '');
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 5 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 5MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `avatar.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedAvatar = await saveUploadedImage({
    uploadDir: avatarUploadDir,
    bucket: 'avatars',
    filePrefix: admin._id.toHexString(),
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 720,
    quality: 86,
  });
  const fileName = savedAvatar.fileName;

  if (admin.avatarPath) {
    const oldPath = path.join(avatarUploadDir, sanitizeFilename(admin.avatarPath));
    await unlink(oldPath).catch(() => undefined);
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  await admins.updateOne(
    { _id: admin._id },
    {
      $set: {
        avatarPath: fileName,
        updatedAt: new Date(),
      },
    },
  );

  return reply.send({ ok: true, avatarUrl: toAvatarUrl(fileName) });
});

server.get('/api/v1/admin/users', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin || admin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can access this route' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const users = await admins.find({}).sort({ createdAt: 1 }).toArray();

  return reply.send({
    users: users.map((user) => ({
      id: user._id.toHexString(),
      email: user.email,
      name: getAdminDisplayName(user),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      avatarUrl: toAvatarUrl(user.avatarPath),
      role: user.role,
      approved: user.approved ?? false,
      active: user.active,
      createdAt: user.createdAt,
    })),
  });
});

server.patch('/api/v1/admin/users/:userId/approval', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can approve users' });
  }

  const params = request.params as { userId?: string } | undefined;
  const userId = String(params?.userId || '');

  if (!ObjectId.isValid(userId)) {
    return reply.code(400).send({ error: 'Invalid user id' });
  }

  const body = request.body as { role?: AdminRole; approved?: boolean; active?: boolean } | undefined;
  const role = body?.role;
  const approved = body?.approved;
  const active = body?.active;

  if (role !== 'moderator' && role !== 'user') {
    return reply.code(400).send({ error: 'Role must be moderator or user' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const target = await admins.findOne({ _id: new ObjectId(userId) });

  if (!target) {
    return reply.code(404).send({ error: 'User not found' });
  }

  if (target.role === 'super_admin') {
    return reply.code(400).send({ error: 'Super admin account cannot be changed from this endpoint' });
  }

  await admins.updateOne(
    { _id: target._id },
    {
      $set: {
        role,
        approved: approved === undefined ? true : Boolean(approved),
        active: active === undefined ? true : Boolean(active),
        updatedAt: new Date(),
      },
    },
  );

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/users/:userId', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can delete users' });
  }

  const params = request.params as { userId?: string } | undefined;
  const userId = String(params?.userId || '');

  if (!ObjectId.isValid(userId)) {
    return reply.code(400).send({ error: 'Invalid user id' });
  }

  const targetId = new ObjectId(userId);

  if (targetId.equals(currentAdmin._id)) {
    return reply.code(400).send({ error: 'You cannot delete your own account' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const target = await admins.findOne({ _id: targetId });

  if (!target) {
    return reply.code(404).send({ error: 'User not found' });
  }

  if (target.role === 'super_admin') {
    return reply.code(400).send({ error: 'Super admin account cannot be deleted' });
  }

  await admins.deleteOne({ _id: target._id });

  if (target.avatarPath) {
    const avatarPath = path.join(avatarUploadDir, sanitizeFilename(target.avatarPath));
    await unlink(avatarPath).catch(() => undefined);
  }

  return reply.send({ ok: true });
});
}
