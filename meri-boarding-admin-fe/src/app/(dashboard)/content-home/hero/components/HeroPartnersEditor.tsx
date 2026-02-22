import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'

import CustomTextField from '@core/components/mui/TextField'

import type { HeroContent, UploadingTarget } from '../types'

type Props = {
  hero: HeroContent
  uploadingTarget: UploadingTarget
  resolvePreviewUrl: (rawUrl: string) => string
  onChange: (updater: (prev: HeroContent) => HeroContent) => void
  onUpload: (file: File, partnerIndex: number) => Promise<void>
  onRemove: (index: number) => void
}

export default function HeroPartnersEditor({ hero, uploadingTarget, resolvePreviewUrl, onChange, onUpload, onRemove }: Props) {
  return (
    <>
      {hero.bookingPartners.map((partner, index) => (
        <Card key={`booking-partner-${index}`} variant='outlined'>
          <CardContent className='flex flex-col gap-3'>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Partner Name'
                  value={partner.name}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      bookingPartners: prev.bookingPartners.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Reservation Link'
                  value={partner.url}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      bookingPartners: prev.bookingPartners.map((item, i) => (i === index ? { ...item, url: e.target.value } : item))
                    }))
                  }
                  helperText='Use /reservation or https://...'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Logo URL'
                  value={partner.logo}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      bookingPartners: prev.bookingPartners.map((item, i) => (i === index ? { ...item, logo: e.target.value } : item))
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  label='Description'
                  value={partner.description}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      bookingPartners: prev.bookingPartners.map((item, i) => (i === index ? { ...item, description: e.target.value } : item))
                    }))
                  }
                  helperText='Optional, max 300 chars'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button component='label' variant='outlined' fullWidth disabled={uploadingTarget?.kind === 'partner' && uploadingTarget?.index === index}>
                  {uploadingTarget?.kind === 'partner' && uploadingTarget?.index === index ? 'Uploading...' : 'Upload Logo'}
                  <input
                    hidden
                    type='file'
                    accept='image/png,image/svg+xml'
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        void onUpload(file, index)
                      }
                      e.currentTarget.value = ''
                    }}
                  />
                </Button>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button color='error' variant='outlined' fullWidth onClick={() => onRemove(index)}>
                  Remove Partner
                </Button>
              </Grid>
              {partner.logo ? (
                <Grid size={{ xs: 12 }}>
                  <img
                    src={resolvePreviewUrl(partner.logo)}
                    alt={partner.name || `Partner ${index + 1}`}
                    style={{ width: 180, maxHeight: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', padding: 8 }}
                  />
                </Grid>
              ) : null}
            </Grid>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
