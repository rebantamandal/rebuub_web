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
      id: 'emotion-detection', title: 'Real-time emotion detection', category: 'Machine learning / Computer vision',
      summary: 'Recognises facial expressions in a live webcam feed, using transfer learning on MobileNetV2 and OpenCV face detection.',
      year: 2025, status: 'Complete',
      stack: ['Python', 'TensorFlow', 'Keras', 'OpenCV', 'MobileNetV2', 'NumPy', 'Matplotlib', 'Jupyter'],
      links: { source: 'https://github.com/rebantamandal/emotion-detection-tf-opencv' },
      image: 'assets/projects/emotion-pipeline.webp',
      imageAlt: 'Pipeline diagram: a webcam frame goes through Haar cascade face detection and a 224 by 224 crop, into MobileNetV2, global average pooling, a 128-unit dense layer with dropout and a softmax, and comes out as a box and emotion label with a confidence percentage.',
      caption: 'The pipeline, from webcam frame to labelled face.',
      facts: [
        { label: 'Model', value: 'MobileNetV2 (ImageNet), frozen' },
        { label: 'Input', value: '224 × 224 RGB face crops' },
        { label: 'Output', value: 'Emotion and confidence' }
      ],
      sections: [
        { heading: 'What it does', paragraphs: [
          'The system watches a webcam feed, finds each face in the frame and labels it with the emotion it most likely shows, alongside a confidence score such as "happy (87.3%)". It can also classify a single photo.',
          'The emotion classes are not hard-coded. They come from the folder names of the training data (for example angry, happy or sad), so the same notebook trains on whichever labelled image set it is given.'
        ] },
        { heading: 'Preparing the data', paragraphs: [
          'Images are read straight from class folders with Keras’ ImageDataGenerator, resized to 224 × 224 pixels, scaled to the 0–1 range and served in batches of 32.',
          'The training set is augmented on the fly with horizontal flips and up to 20% zoom, so the model sees more variation than the raw images contain. Validation images are only rescaled, which keeps the validation score an honest measure.'
        ] },
        { heading: 'The model', paragraphs: [
          'Rather than training a network from scratch, the model reuses MobileNetV2 pre-trained on ImageNet as a frozen feature extractor. MobileNetV2 is a compact architecture designed for mobile devices, which suits a model that has to run on every video frame.',
          'On top of it sits a small classifier: global average pooling, a 128-unit dense layer with ReLU, dropout of 0.5 against overfitting, and a softmax layer with one output per emotion. It is compiled with the Adam optimiser and categorical cross-entropy loss.'
        ] },
        { heading: 'Training', paragraphs: [
          'Training runs for up to 20 epochs. Early stopping ends it once validation loss has not improved for three epochs and restores the best weights, while a checkpoint keeps the best model on disk. Training and validation accuracy and loss are plotted afterwards to check for under- or overfitting.'
        ] },
        { heading: 'Detecting emotions live', paragraphs: [
          'Each webcam frame is converted to grayscale and passed to OpenCV’s frontal-face Haar cascade. Every detected face is cropped from the colour frame, resized and scaled like the training images, and classified. The frame is then drawn with a box around each face and its label, until q is pressed.',
          'The loop is wrapped so that the camera is always released and the window closed, even if a frame cannot be read or an error occurs.'
        ] },
        { heading: 'How it evolved', paragraphs: [
          'The first version, in June 2025, trained for a fixed ten epochs and showed only the predicted label. The September 2025 revision added early stopping and checkpointing, training curves, a confidence percentage on each label, error handling around the camera, and prediction from a single image.'
        ] },
        { heading: 'Limitations and next steps', paragraphs: [
          'OpenCV delivers frames in BGR colour order while Keras loads training images as RGB, so converting frames to RGB before prediction would make live input match training. MobileNetV2 also expects its own preprocessing, which scales pixels to −1 to 1 rather than 0 to 1.',
          'The base network is frozen; unfreezing and fine-tuning its top layers at a low learning rate should improve accuracy. Calling the model once per face per frame is slow, and the Haar cascade misses faces that are turned or poorly lit, so batching predictions and switching to a DNN face detector are natural upgrades. A per-class confusion matrix would show which emotions are most often confused.'
        ] }
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
                preview: 'https://…preview.m4a', listen: 'https://music.apple.com/…' }
     Without an image, a cover is generated from the title and accent colour. */
  shelf: [
    { id: 'death-stranding', type: 'games', title: 'Death Stranding',
      image: 'assets/shelf/death-stranding.webp',
      imageAlt: 'Death Stranding Director\'s Cut cover art: Sam Porter Bridges cradling a BB pod against a hazy golden sky.',
      accent: '#d9a74a', developer: 'Kojima Productions', year: 2019,
      note: 'The quiet between deliveries. Weather, terrain, and the distant outline of somewhere to reach.',
      body: [
        'Most games want you to get somewhere fast. Death Stranding makes getting there the whole game, and once that clicks, planning a route over a ridge feels better than any boss fight.',
        'What stays with me is how lonely it is without ever feeling empty. You never meet another player, but you keep finding their ladders, ropes and bridges exactly where you needed them. No other game has made strangers feel this kind.',
        'The opening hours ask for patience. Give it that, let Low Roar come in on a long walk over the hills, and it turns into something nothing else really feels like.'
      ],
      highlights: [
        'Finally reaching the top of the snowy mountains and seeing the next valley open up below.',
        'Finding a stranger’s bridge over a river I had been dreading crossing.',
        'Timefall rolling in right when the cargo was almost home.'
      ] },
    { id: 'cyberpunk', type: 'games', title: 'Cyberpunk 2077',
      image: 'assets/shelf/cyberpunk.webp',
      imageAlt: 'Cyberpunk 2077 cover art: V, Johnny Silverhand, Solomon Reed and Songbird against a yellow and red backdrop.',
      accent: '#f0e14a', developer: 'CD Projekt Red', year: 2020,
      note: 'Night City after the main objective is over. Side streets, small scenes, and another reason to stay out.',
      body: [
        'Night City is the real main character: loud, vertical, and at its most beautiful at three in the morning in the rain. After the 2.0 update and Phantom Liberty, the whole game finally lives up to it.',
        'The side jobs are where it shines. Some of the smallest gigs are better written than most games’ main stories, and Judy, Panam and Johnny make the city feel lived in rather than decorated.',
        'The menus can get busy, but I never cared. I would happily spend another hour just driving through the city at night with the radio on.'
      ],
      highlights: [
        'Diving with Judy at Laguna Bend.',
        'Johnny turning up in the passenger seat halfway through a drive.',
        'Leaving the city lights behind for the Badlands at sunrise.'
      ] },
    { id: 'lvl', type: 'music', kind: 'Song', title: 'LVL',
      image: 'assets/shelf/lvl.webp',
      imageAlt: 'LONG.LIVE.A$AP album cover: a black-and-white, glitch-streaked portrait of A$AP Rocky wrapped in an American flag.',
      accent: '#c7ccd4', artist: 'A$AP Rocky', album: 'LONG.LIVE.A$AP', year: 2013,
      note: 'Hazy, slow and effortlessly cool. The beat does half the talking.',
      body: [
        'LVL sounds like it was recorded at the edge of sleep. Clams Casino’s production is all haze and slowed-down space, and Rocky floats over it without ever rushing. That calm confidence is the whole appeal.',
        'It is not the loudest song on LONG.LIVE.A$AP, and it does not need to be. Late at night with headphones on, it is the one I keep putting back on.'
      ],
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/e1/ef/2e/e1ef2e02-5fd4-1fcc-f38b-2c318d48c63c/mzaf_14041393516190738279.plus.aac.p.m4a',
      listen: 'https://music.apple.com/us/album/lvl/581997129?i=581997274' },
    { id: 'waves', type: 'music', kind: 'Song', title: 'Waves',
      image: 'assets/shelf/waves.webp',
      imageAlt: 'The Life of Pablo album cover: rows of the album title in black type on an orange background, with a small vintage wedding photograph in the corner.',
      accent: '#f08a5a', artist: 'Kanye West', album: 'The Life of Pablo', year: 2016,
      note: 'Pure lift. Three minutes that feel like the windows are down.',
      body: [
        'Waves is the brightest moment on The Life of Pablo. It builds like a swell, stacking voices and warm synths until the whole thing feels weightless, and Kid Cudi’s hook is the kind that stays in your head for days.',
        'It is short and almost too simple on paper, but that is its magic. Every time it comes on, the mood of the room changes.'
      ],
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/64/54/72/6454723d-407d-f2e4-7db7-e24b8f40e7d2/mzaf_3826964363389813889.plus.aac.p.m4a',
      listen: 'https://music.apple.com/us/album/waves/1443063578?i=1443063983' }
  ],
  /* The shelf song shown in the "now playing" card on Home (its id). Leave empty to hide it.
     `preview` on a music item is a short https audio clip, played only when pressed. */
  nowPlaying: 'lvl'
};
