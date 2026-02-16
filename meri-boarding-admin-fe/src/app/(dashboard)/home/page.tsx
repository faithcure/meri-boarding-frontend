import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

export default function Page() {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Meri Admin Dashboard</Typography>
        <Typography color='text.secondary'>Start managing public content modules from here.</Typography>
      </Grid>
    </Grid>
  )
}
