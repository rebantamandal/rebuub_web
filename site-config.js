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
  projects: [
    {
      id: 'website', title: 'Personal website', category: 'Web / Personal',
      summary: 'An independent place to publish and collect.', image: 'assets/website-study.webp',
      body: [
        'Built as a small, static website. The content lives in one editable file, with no account or database required to browse.',
        'Project notes, journal entries and shelf items each have a dedicated page and address. The shared navigation keeps the way back visible without interrupting the content.'
      ],
      facts: [
        { label: 'Interface', value: 'HTML, CSS, JavaScript' },
        { label: 'Pages', value: 'Statically generated' },
        { label: 'Dependencies', value: 'No runtime packages' }
      ]
    },
    {
      id: 'glass', title: 'Rain on glass', category: 'Light / Interaction',
      summary: 'An optical study, running in the browser.', image: 'assets/glass-study.webp',
      body: [
        'A field of curved droplets bends the image underneath. Moving water collects smaller beads and leaves thin trails; a shared light direction links the wet surface to the object behind it.',
        'Dark colours cycle through the full spectrum into black behind the scene. Occasional distant lightning adds a soft, localized glow. The lettering keeps a steady cyan-to-periwinkle finish; the sphere material is rendered separately, without a colour filter.',
        'Pointer proximity deforms the lettering and the floating spheres through damped springs. The spheres reuse the original Orbit surface shader and its spherical form, travelling on either side of the lettering. Small beads grow from their surfaces and detach upward; their shadows fall only on the letter surfaces. Clicking or tapping breaks a sphere into smaller metallic beads. These are real-time optical and elastic approximations, not a fluid solver or a path-traced reconstruction.'
      ],
      facts: [
        { label: 'Rendering', value: 'WebGL + Canvas 2D' },
        { label: 'Input', value: 'Pointer, touch, keyboard' },
        { label: 'Motion', value: 'Automatic or reduced' }
      ]
    }
  ],
  /* Add journal entries here. Each becomes /journal/<id>. No sample is published.
     { id: 'your-entry', title: 'Title', summary: 'List introduction only.',
       date: '2026-09-15', tags: ['Notes'], body: ['Your opening paragraph.'],
       sections: [{ heading: 'A section', paragraphs: ['More of your writing.'] }] }
  */
  journal: [],
  shelf: [
    { id: 'death-stranding', title: 'Death Stranding', category: 'Games', art: 'landscape',
      note: 'The quiet between deliveries. Weather, terrain, and the distant outline of somewhere to reach.' },
    { id: 'cyberpunk', title: 'Cyberpunk 2077', category: 'Games', art: 'city',
      note: 'Night City after the main objective is over. Side streets, small scenes, and another reason to stay out.' }
  ]
};
