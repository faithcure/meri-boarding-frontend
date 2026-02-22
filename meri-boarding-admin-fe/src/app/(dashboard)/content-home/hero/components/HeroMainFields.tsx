import Grid from '@mui/material/Grid'

import CustomTextField from '@core/components/mui/TextField'

import type { HeroContent } from '../types'

type Props = {
  hero: HeroContent
  onChange: (updater: (prev: HeroContent) => HeroContent) => void
}

export default function HeroMainFields({ hero, onChange }: Props) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <CustomTextField label='Title Lead' value={hero.titleLead} onChange={e => onChange(prev => ({ ...prev, titleLead: e.target.value }))} fullWidth />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <CustomTextField
          label='Title Highlight'
          value={hero.titleHighlight}
          onChange={e => onChange(prev => ({ ...prev, titleHighlight: e.target.value }))}
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <CustomTextField label='Title Tail' value={hero.titleTail} onChange={e => onChange(prev => ({ ...prev, titleTail: e.target.value }))} fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CustomTextField
          multiline
          minRows={3}
          label='Description'
          value={hero.description}
          onChange={e => onChange(prev => ({ ...prev, description: e.target.value }))}
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField label='CTA Locations' value={hero.ctaLocations} onChange={e => onChange(prev => ({ ...prev, ctaLocations: e.target.value }))} fullWidth />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField
          label='CTA Locations Link'
          value={hero.ctaLocationsHref}
          onChange={e => onChange(prev => ({ ...prev, ctaLocationsHref: e.target.value }))}
          helperText='Use /hotels or https://...'
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField label='CTA Quote' value={hero.ctaQuote} onChange={e => onChange(prev => ({ ...prev, ctaQuote: e.target.value }))} fullWidth />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField
          label='CTA Quote Link'
          value={hero.ctaQuoteHref}
          onChange={e => onChange(prev => ({ ...prev, ctaQuoteHref: e.target.value }))}
          helperText='Use /contact or https://...'
          fullWidth
        />
      </Grid>
    </Grid>
  )
}
