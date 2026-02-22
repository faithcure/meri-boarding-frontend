import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import type { HeroContent, UploadingTarget } from '../types'

type Props = {
  hero: HeroContent
  uploadingTarget: UploadingTarget
  positionPresets: string[]
  resolvePreviewUrl: (rawUrl: string) => string
  onChange: (updater: (prev: HeroContent) => HeroContent) => void
  onUpload: (file: File, slideIndex: number) => Promise<void>
  onRemove: (index: number) => void
}

export default function HeroSlidesEditor({ hero, uploadingTarget, positionPresets, resolvePreviewUrl, onChange, onUpload, onRemove }: Props) {
  return (
    <>
      {hero.slides.map((slide, index) => (
        <Card key={`hero-slide-${index}`} variant='outlined'>
          <CardContent className='flex flex-col gap-3'>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <CustomTextField
                  label='Image URL'
                  value={slide.image}
                  onChange={e => onChange(prev => ({ ...prev, slides: prev.slides.map((item, i) => (i === index ? { ...item, image: e.target.value } : item)) }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  select
                  label='Position Preset'
                  value={positionPresets.includes(slide.position) ? slide.position : ''}
                  onChange={e => onChange(prev => ({ ...prev, slides: prev.slides.map((item, i) => (i === index ? { ...item, position: e.target.value } : item)) }))}
                  fullWidth
                >
                  <MenuItem value=''>Custom</MenuItem>
                  {positionPresets.map(preset => (
                    <MenuItem key={preset} value={preset}>
                      {preset}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <CustomTextField
                  label='Position'
                  value={slide.position}
                  onChange={e => onChange(prev => ({ ...prev, slides: prev.slides.map((item, i) => (i === index ? { ...item, position: e.target.value } : item)) }))}
                  helperText='e.g. center 35%'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button component='label' variant='outlined' fullWidth disabled={uploadingTarget?.kind === 'slide' && uploadingTarget?.index === index}>
                  {uploadingTarget?.kind === 'slide' && uploadingTarget?.index === index ? 'Uploading...' : 'Upload Image'}
                  <input
                    hidden
                    type='file'
                    accept='image/png,image/jpeg,image/jpg,image/webp'
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
                  Remove Slide
                </Button>
              </Grid>
              {slide.image ? (
                <Grid size={{ xs: 12 }}>
                  <img
                    src={resolvePreviewUrl(slide.image)}
                    alt={`Hero slide ${index + 1}`}
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
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
