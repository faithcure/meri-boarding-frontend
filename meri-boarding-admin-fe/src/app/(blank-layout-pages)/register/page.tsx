import type { Metadata } from 'next'
import RegisterView from '@views/Register'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account'
}

const RegisterPage = () => {
  return <RegisterView />
}

export default RegisterPage
