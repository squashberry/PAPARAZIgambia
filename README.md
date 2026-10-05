# PAPARAZZI🇬🇲

The Gambia-first people, culture, nightlife and social-scene publication.

## Included

- Premium editorial front page and story reader
- Supabase email/password sign up and sign in
- Contributor Studio
- Become a PAPARAZZI contributor
- Community publishing
- Anonymous tip submission queue
- Custom splash, 404 and offline states
- Responsive mobile-first layout
- GitHub Pages deployment

## Backend

PAPARAZZI uses an existing Supabase project with dedicated tables:

- paparazi_profiles
- paparazi_articles
- paparazi_submissions

All three tables have RLS enabled. Anonymous submissions are not publicly readable.

## GitHub Pages

Repository: https://github.com/squashberry/PAPARAZZIgambia
Expected site: https://squashberry.github.io/PAPARAZZIgambia/

The site is intentionally dependency-light and can be served directly by GitHub Pages.
