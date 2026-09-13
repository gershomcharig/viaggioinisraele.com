/* Isaac Charig — 2026 redesign interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var mobileMenu = document.querySelector('.mobile-menu');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      var open = mobileMenu.hidden;
      mobileMenu.hidden = !open;
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mobileMenu.hidden = true;
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Journey index (route tabs) ---------- */
  var routes = [
    {
      num: '01',
      title: 'Old Jerusalem',
      tag: 'Faith · history · stone',
      img: 'images/itinerari/gerusalemme-antica.jpg',
      alt: 'The Old City of Jerusalem',
      coord: '31.7780° N · 35.2354° E',
      eyebrow: 'The most spiritual journey',
      name: 'Old City of Jerusalem',
      desc: 'Sacred places, stone lanes and communities shaped by centuries of faith and history — explored with space to ask, listen and understand. Mount of Olives, Gethsemane, the Holy Sepulchre, the Via Dolorosa, the Western Wall, the four quarters and the Church of the Nativity in Bethlehem.',
      tags: ['Private journey', 'Walking', 'History & faith']
    },
    {
      num: '02',
      title: 'Dead Sea & Masada',
      tag: 'Desert · archaeology',
      img: 'images/itinerari/mar-morto.jpg',
      alt: 'The Dead Sea and Masada',
      coord: '31.3122° N · 35.3622° E',
      eyebrow: 'The lowest place on Earth',
      name: 'Dead Sea & Masada',
      desc: 'Jericho, the oldest city in the world, the Qumran caves, the Ein Gedi oasis and the Masada fortress — the symbol of Jewish resistance to Rome — ending with the unforgettable feeling of floating in the Dead Sea.',
      tags: ['Private journey', 'Driving', 'Desert & archaeology']
    },
    {
      num: '03',
      title: 'Upper & Lower Galilee',
      tag: 'Origins · landscape',
      img: 'images/itinerari/galilea.jpg',
      alt: 'The hills of Galilee',
      coord: '32.7940° N · 35.5270° E',
      eyebrow: 'Towards Mount Tabor',
      name: 'Upper & Lower Galilee',
      desc: 'The Sea of Galilee, Capernaum, the Mount of Beatitudes, Tabgha, the Golan Heights, Caesarea Philippi and Mount Hermon — the landscapes where traditions began.',
      tags: ['Private journey', 'Driving', 'Origins & landscape']
    },
    {
      num: '04',
      title: 'Nazareth',
      tag: 'Christianity · culture',
      img: 'images/itinerari/nazaret.jpg',
      alt: 'Nazareth',
      coord: '32.6996° N · 35.3035° E',
      eyebrow: 'The origins of Christianity',
      name: 'Nazareth',
      desc: 'The Church of the Annunciation, Cana of Galilee, the Sea of Galilee, Capernaum, the Mount of Beatitudes, Tabgha, the Golan Heights, Caesarea Philippi and Mount Hermon.',
      tags: ['Private journey', 'Walking', 'Christianity & culture']
    },
    {
      num: '05',
      title: 'Tel Aviv to Haifa',
      tag: 'Coast · cities · gardens',
      img: 'images/itinerari/telaviv-haifa.jpg',
      alt: 'The Mediterranean coast between Tel Aviv and Haifa',
      coord: '32.7940° N · 34.9896° E',
      eyebrow: 'A journey along the coast',
      name: 'Tel Aviv to Haifa',
      desc: 'Old Jaffa and its 4,000 years of history, the Bauhaus White City, Roman Caesarea, wine tastings at Zichron Yaakov, the Druze villages of Mount Carmel, the Bahá’í gardens of Haifa and the crusader city of Akko.',
      tags: ['Private journey', 'Driving', 'Coast & cities']
    },
    {
      num: '06',
      title: 'Modern Jerusalem',
      tag: 'Memory · society · today',
      img: 'images/itinerari/gerusalemme-moderna.jpg',
      alt: 'Modern Jerusalem',
      coord: '31.7683° N · 35.2137° E',
      eyebrow: 'The face of a country',
      name: 'Modern Jerusalem',
      desc: 'Yad Vashem, the Israel Museum, the Shrine of the Book with the Dead Sea Scrolls, the model of Jerusalem in year 0, the Machane Yehuda market, the ultra-Orthodox quarter and Yemin Moshe.',
      tags: ['Private journey', 'Walking', 'Memory & society']
    },
    {
      num: '07',
      title: 'Judean & Negev Desert',
      tag: 'Silence · geology · space',
      img: 'images/itinerari/neghev.jpg',
      alt: 'The Judean and Negev desert',
      coord: '30.8761° N · 34.7985° E',
      eyebrow: 'A walk in the desert',
      name: 'Judean & Negev Desert',
      desc: 'The silence and space of the desert — geological formations, ancient trade routes, Bedouin hospitality and landscapes that seem to belong to another planet.',
      tags: ['Private journey', 'Driving', 'Silence & geology']
    },
    {
      num: '08',
      title: 'Eilat & Petra',
      tag: 'Red Sea · ancient routes',
      img: 'images/itinerari/eilat-petra.jpg',
      alt: 'The Red Sea at Eilat',
      coord: '29.5577° N · 34.9519° E',
      eyebrow: 'Wonders of the Red Sea',
      name: 'Eilat & Petra',
      desc: 'The fabulous Red Sea, its untouched coral reserves, snorkelling with dolphins — and a day trip across the border to Petra, the rose-red city of the Nabataeans.',
      tags: ['Private journey', 'Driving', 'Red Sea & ancient routes']
    }
  ];

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.route-tab'));
  var stageImg = document.querySelector('.route-image-wrap img');
  var stageWrap = document.querySelector('.route-image-wrap');
  var stageCoord = document.querySelector('.route-coordinate');
  var stageEyebrow = document.querySelector('.route-eyebrow');
  var stageName = document.querySelector('.route-copy h3');
  var stageDesc = document.querySelector('.route-copy > p:not(.route-eyebrow)');
  var stageTags = document.querySelector('.route-tags');
  var stageAsk = document.querySelector('.route-ask');

  function renderRoute(index) {
    var route = routes[index];

    tabs.forEach(function (tab, i) {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    if (stageWrap) {
      stageWrap.classList.add('is-changing');
      window.setTimeout(function () {
        stageImg.src = route.img;
        stageImg.alt = route.alt;
        stageWrap.classList.remove('is-changing');
      }, 260);
    }

    if (stageCoord) stageCoord.textContent = route.coord;
    if (stageEyebrow) stageEyebrow.textContent = route.eyebrow;
    if (stageName) stageName.textContent = route.name;
    if (stageDesc) stageDesc.textContent = route.desc;
    if (stageTags) {
      stageTags.innerHTML = '';
      route.tags.forEach(function (tag) {
        var span = document.createElement('span');
        span.textContent = tag;
        stageTags.appendChild(span);
      });
    }
    if (stageAsk) stageAsk.href = '#contact';
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { renderRoute(index); });
  });

  /* ---------- Interest picker ---------- */
  var interestResults = {
    history: 'Old City of Jerusalem · Masada · Caesarea',
    faith: 'Old City of Jerusalem · Nazareth · Galilee',
    nature: 'Dead Sea & Masada · Judean & Negev Desert · Ein Gedi',
    cities: 'Tel Aviv to Haifa · Modern Jerusalem · Jaffa',
    first: 'Old City of Jerusalem · Dead Sea & Masada · Modern Jerusalem'
  };

  var interestBtns = Array.prototype.slice.call(document.querySelectorAll('.interest-btn'));
  var interestResult = document.querySelector('.interest-result p');

  interestBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      interestBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      if (interestResult && interestResults[btn.dataset.interest]) {
        interestResult.textContent = interestResults[btn.dataset.interest];
      }
    });
  });

  /* ---------- WhatsApp trip brief ---------- */
  var form = document.getElementById('trip-form');
  var WHATSAPP_NUMBER = '972546267521';

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var lines = ['Hello Isaac, I would like to plan a trip to Israel.'];
      var name = (data.get('name') || '').trim();
      var dates = (data.get('dates') || '').trim();
      var travellers = (data.get('travellers') || '').trim();
      var interest = (data.get('interest') || '').trim();
      var notes = (data.get('notes') || '').trim();

      if (name) lines.push('Name: ' + name);
      if (dates) lines.push('Travel dates: ' + dates);
      if (travellers) lines.push('Travellers: ' + travellers);
      if (interest) lines.push('Main interest: ' + interest);
      if (notes) lines.push('Notes: ' + notes);

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();