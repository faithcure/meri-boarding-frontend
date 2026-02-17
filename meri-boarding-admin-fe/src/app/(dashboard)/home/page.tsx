import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

export default function Page() {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Meri Admin Dashboard</Typography>
        <Typography color='text.secondary'>Start managing public content modules from here.</Typography>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap gap-3'>
          <Button href='/content-home' variant='contained'>
            Manage Home Content
          </Button>
          <Button href='/hotels' variant='outlined'>
            Manage Hotels
          </Button>
        </div>
      </Grid>
    </Grid>
  )
}
