/* Public content. Edit here, then run `node tools/build_site.js` to refresh the
   hosted pages. The preview loads these values directly. Never store secrets
   or unpublished private drafts in this file. IDs become permanent page URLs. */
window.SITE = {
  handle: 'rebuub',
  name: 'Rebanta Mandal',
  about: [
    'I am interested in how digital spaces feel, as much as how they work.'
  ],
  /* Shown as icons on the homepage. `icon` names a symbol in tools/template.html
     (linkedin, instagram, github, steam, mail). Leave a URL empty ('') to hide it. */
  socials: [
    { label: 'LinkedIn', icon: 'linkedin', url: 'https://in.linkedin.com/in/rebantamandal' },
    { label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/rebuub' },
    { label: 'GitHub', icon: 'github', url: 'https://github.com/rebantamandal' },
    { label: 'Steam', icon: 'steam', url: 'https://steamcommunity.com/id/rebuub/' },
    { label: 'Email', icon: 'mail', url: 'mailto:mandalrebanta@gmail.com' }
  ],
  /* Quotes shown on the About page. */
  quotes: [
    { text: 'The unexamined life is not worth living.', author: 'Socrates', source: 'Plato, Apology' },
    { text: 'We shape our buildings; thereafter they shape us.', author: 'Winston Churchill', source: 'House of Commons, 1943' },
    { text: 'The medium is the message.', author: 'Marshall McLuhan', source: 'Understanding Media, 1964' },
    { text: 'One must imagine Sisyphus happy.', author: 'Albert Camus', source: 'The Myth of Sisyphus, 1942' }
  ],
  /* The final public address. Canonical links, share previews, sitemap.xml and
     robots.txt are built from it. Change it if the site is served elsewhere. */
  siteUrl: 'https://rebuub.vercel.app',
  spotifyUrl: '',
  /* Images for projects, journal entries and shelf items. `image` is the cover
     (card thumbnail and main figure); `images` adds more, shown as a gallery below
     the entry that opens larger on click. Either field alone works. Put files in
     assets/ and describe each one in `alt`:
       image: 'assets/cover.webp', imageAlt: 'What the cover shows',
       images: [
         { src: 'assets/detail-1.webp', alt: 'What it shows', caption: 'Optional caption' },
         'assets/detail-2.webp'
       ] */
  /* Projects are case studies: content first. Each becomes /projects/<id>.
     Newest `year` is listed first. Every field except id and title is optional,
     but summary, year and at least one section are expected (the build warns).
     { id: 'my-project', title: 'Title', category: 'Web / Tool',
       summary: 'One sentence on what it is and who it is for.',
       year: 2026, status: 'Live',          // Live / In progress / Archived
       role: 'Design & development', duration: '3 weeks',
       stack: ['TypeScript', 'WebGL'],
       links: { live: 'https://…', source: 'https://github.com/…', writeup: 'https://…' },
       image: 'assets/projects/my-project.webp', imageAlt: 'What the screenshot shows',
       facts: [{ label: 'Platform', value: 'Web' }],
       body: ['Optional introduction before the first section.'],
       sections: [
         { heading: 'The problem', paragraphs: ['…'] },
         { heading: 'How it works', paragraphs: ['…'], images: [{ src: 'assets/…', alt: '…', caption: '…' }] },
         { heading: 'What I learned', paragraphs: ['…'] }
       ] } */
  projects: [
    {
      id: 'website', title: 'Personal website', category: 'Web / Personal',
      summary: 'An independent place to publish and collect.',
      year: 2026, status: 'Live', stack: ['HTML', 'CSS', 'JavaScript'],
      links: { live: 'https://rebuub.vercel.app/' },
      image: 'assets/website-study.webp', imageAlt: 'The rebuub homepage: the wordmark with floating metallic spheres on a dark background.',
      facts: [
        { label: 'Pages', value: 'Statically generated' },
        { label: 'Dependencies', value: 'No runtime packages' }
      ],
      sections: [
        { heading: 'How it is built', paragraphs: ['Built as a small, static website. The content lives in one editable file, with no account or database required to browse.'] },
        { heading: 'Pages and navigation', paragraphs: ['Project notes, journal entries and shelf items each have a dedicated page and address. The shared navigation keeps the way back visible without interrupting the content.'] }
      ]
    },
    {
      id: 'glass', title: 'Rain on glass', category: 'Light / Interaction',
      summary: 'An optical study, running in the browser.',
      year: 2026, status: 'Live', stack: ['WebGL', 'Canvas 2D', 'JavaScript'],
      links: { live: 'https://rebuub.vercel.app/' },
      image: 'assets/glass-study.webp', imageAlt: 'A large water droplet on dark glass, crossed by a diagonal band of light.',
      facts: [
        { label: 'Input', value: 'Pointer, touch, keyboard' },
        { label: 'Motion', value: 'Automatic or reduced' }
      ],
      sections: [
        { heading: 'The optics', paragraphs: ['A field of curved droplets bends the image underneath. Moving water collects smaller beads and leaves thin trails; a shared light direction links the wet surface to the object behind it.'] },
        { heading: 'Colour and light', paragraphs: ['Dark colours cycle through the full spectrum into black behind the scene. Occasional distant lightning adds a soft, localized glow. The lettering keeps a steady cyan-to-periwinkle finish; the sphere material is rendered separately, without a colour filter.'] },
        { heading: 'Interaction', paragraphs: ['Pointer proximity deforms the lettering and the floating spheres through damped springs. The spheres reuse the original Orbit surface shader and its spherical form, travelling on either side of the lettering. Small beads grow from their surfaces and detach upward; their shadows fall only on the letter surfaces. Clicking or tapping breaks a sphere into smaller metallic beads.', 'These are real-time optical and elastic approximations, not a fluid solver or a path-traced reconstruction.'] }
      ]
    }
  ],
  /* Add journal entries here. Each becomes /journal/<id>. No sample is published.
     { id: 'your-entry', title: 'Title', summary: 'List introduction only.',
       date: '2026-09-15', tags: ['Notes'], body: ['Your opening paragraph.'],
       sections: [{ heading: 'A section', paragraphs: ['More of your writing.'] }] }
  */
  journal: [],
  /* Shelf sections. Each becomes a tab at /shelf/<id> once it has an item.
     `facts` are short templates shown under the title; one appears only when every
     {field} in it is filled in. `cover` is the poster shape. `statuses` are the
     allowed values for an item's status (the build checks them). */
  shelfTypes: [
    { id: 'games', label: 'Games', singular: 'Game', cover: '2:3',
      statuses: ['Playing', 'Finished', 'Replaying', 'On hold', 'Dropped'],
      facts: ['{developer}', '{year}', 'Played on {platform}', '{hours} hours'] },
    { id: 'books', label: 'Books', singular: 'Book', cover: '2:3',
      statuses: ['Reading', 'Read', 'Want to read'],
      facts: ['{author}', '{year}', '{pages} pages'] },
    { id: 'music', label: 'Music', singular: 'Music', cover: '1:1',
      statuses: ['On repeat', 'All-time favourite'],
      facts: ['{artist}', '{album}', '{year}'] }
  ],
  /* Shelf items: personal and visual. Each becomes /shelf/<id>; ids must be unique
     across all types and must not match a type id. Only id, type and title are required.
     A game:  { id: 'elden-ring', type: 'games', title: 'Elden Ring',
                image: 'assets/shelf/elden-ring.webp', imageAlt: 'Cover art',
                accent: '#c9a24a',                 // mood colour for the card and page
                developer: 'FromSoftware', year: 2022, platform: 'PC', hours: 140,
                status: 'Finished', rating: 5,
                note: 'Why it is on the shelf, in a sentence.',
                body: ['Longer thoughts.'],
                highlights: ['A moment that stayed with you.'],
                images: ['assets/shelf/elden-ring-1.webp'] }
     A book:  { id: 'piranesi', type: 'books', title: 'Piranesi', author: 'Susanna Clarke',
                year: 2020, status: 'Read', favouriteLine: 'A line you underlined.' }
     A song or album: { id: 'song-id', type: 'music', kind: 'Song', title: 'Title',
                artist: 'Artist', album: 'Album', year: 2019, status: 'On repeat',
                listen: 'https://open.spotify.com/track/…' }   // Spotify links can play in the page
     Without an image, a cover is generated from the title and accent colour. */
  shelf: [
    { id: 'death-stranding', type: 'games', title: 'Death Stranding',
      image: 'assets/shelf/death-stranding.webp',
      imageAlt: 'Death Stranding Director\'s Cut cover art: Sam Porter Bridges cradling a BB pod against a hazy golden sky.',
      accent: '#d9a74a', developer: 'Kojima Productions', year: 2019,
      note: 'The quiet between deliveries. Weather, terrain, and the distant outline of somewhere to reach.' },
    { id: 'cyberpunk', type: 'games', title: 'Cyberpunk 2077',
      image: 'assets/shelf/cyberpunk.webp',
      imageAlt: 'Cyberpunk 2077 cover art: V, Johnny Silverhand, Solomon Reed and Songbird against a yellow and red backdrop.',
      accent: '#f0e14a', developer: 'CD Projekt Red', year: 2020,
      note: 'Night City after the main objective is over. Side streets, small scenes, and another reason to stay out.' }
  ]
};
