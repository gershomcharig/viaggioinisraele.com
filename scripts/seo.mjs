// These translation keys drive both the visible accordion and its JSON-LD.
const faqKeys = [
  ['do_you_guide_pilgrimage_and_parish_groups', 'yes_i_guide_families_small_groups_and_organised'],
  ['can_we_include_time_for_prayer', 'of_course_we_can_include_time_for_reflection'],
  ['i_m_not_religious_is_this_trip_for', 'absolutely_israel_is_a_crossroads_of_history_cultures'],
  ['how_much_does_a_tour_cost', 'it_depends_on_the_length_of_the_trip'],
  ['are_the_tours_in_english', 'yes_i_guide_english_speaking_travellers_throughout_their'],
];

export const heroImage = { path: '/images/jerusalem-1.webp', width: 1500, height: 900 };
const socialImage = { path: '/images/social-card.jpg', width: 1200, height: 630 };

export function faqsFor(copy) {
  return faqKeys.map(([question, answer]) => {
    if (!copy[question]?.trim() || !copy[answer]?.trim()) throw new Error(`Missing FAQ translation: ${question}/${answer}`);
    return { question: copy[question], answer: copy[answer] };
  });
}

export function renderFaqs(faqs, escape) {
  return faqs.map(({ question, answer }, index) => `<details data-rv="${index * 100}" name="faq"${index === 0 ? ' open' : ''} class="faq-item">
    <summary class="faq-question"><span>${escape(question)}</span><span class="faq-icon">+</span></summary>
    <p class="faq-answer">${escape(answer)}</p>
  </details>`).join('\n');
}

export function socialMetadata({ title, description, name, url, origin, imageAlt }, escape) {
  const image = `${origin}${socialImage.path}`;
  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:site_name', name],
    ['property', 'og:url', url],
    ['property', 'og:image', image],
    ['property', 'og:image:type', 'image/jpeg'],
    ['property', 'og:image:width', socialImage.width],
    ['property', 'og:image:height', socialImage.height],
    ['property', 'og:image:alt', imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
    ['name', 'twitter:image:alt', imageAlt],
  ];
  return tags.map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escape(value)}" />`).join('\n        ');
}

export function structuredData({ origin, languages, language, copy, faqs }) {
  const url = `${origin}${language.path}`;
  const website = `${origin}/#website`;
  const person = `${origin}/#guide`;
  const page = `${url}#webpage`;
  const service = `${url}#service`;
  const faq = `${url}#faq`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': website, url: `${origin}/`, name: copy.site_name,
        inLanguage: languages.map(item => item.code), publisher: { '@id': person },
      },
      {
        '@type': 'WebPage', '@id': page, url, name: copy.site_title,
        description: copy.site_description, inLanguage: language.code,
        isPartOf: { '@id': website }, about: { '@id': person },
        mainEntity: { '@id': service }, hasPart: { '@id': faq },
        primaryImageOfPage: {
          '@type': 'ImageObject', url: `${origin}${heroImage.path}`,
          width: heroImage.width, height: heroImage.height, caption: copy.jerusalem_s_old_city,
        },
      },
      {
        '@type': 'Person', '@id': person, name: copy.isacco_charig,
        url: `${url}#cap-2`, image: `${origin}/images/isacco-1.webp`,
        description: `${copy.intro_drop_cap}${copy.intro_after_drop_cap}`,
        telephone: '+972546267521', email: 'i.charig@gmail.com',
        knowsLanguage: languages.map(item => item.code),
      },
      {
        '@type': 'Service', '@id': service, url: `${url}#cap-4`,
        name: copy.site_title, description: copy.site_description,
        provider: { '@id': person }, areaServed: { '@type': 'Country', name: 'Israel' },
        mainEntityOfPage: { '@id': page },
      },
      {
        '@type': 'FAQPage', '@id': faq, url: `${url}#cap-8`,
        inLanguage: language.code, isPartOf: { '@id': page }, about: { '@id': service },
        mainEntity: faqs.map(({ question, answer }) => ({
          '@type': 'Question', name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}
