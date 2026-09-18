import { filterTerms } from './filter.js';
import { CATEGORY_TITLES } from './categories.js';

const results = document.querySelector('#results');
const count = document.querySelector('#count');
const input = document.querySelector('#q');

const entries = await fetch('glossary.json').then((r) => r.json());

function render(list) {
  count.textContent = `${list.length} of ${entries.length} terms`;

  if (list.length === 0) {
    results.innerHTML =
      '<p class="empty">No term matches that. Try a shorter word — or open a pull request and add it.</p>';
    return;
  }

  results.innerHTML = Object.entries(CATEGORY_TITLES)
    .map(([key, title]) => {
      const group = list
        .filter((e) => e.category === key)
        .sort((a, b) => a.term.localeCompare(b.term, 'en'));
      if (group.length === 0) return '';
      return `<section><h2>${title}</h2>${group.map(card).join('')}</section>`;
    })
    .join('');
}

function card(e) {
  return `<article class="term" id="${e.slug}">
    <h3>${escape(e.term)}</h3>
    <p class="short">${escape(e.short)}</p>
    <p class="why"><strong>Why it matters.</strong> ${escape(e.why)}</p>
    <p class="hear"><strong>You'll hear it.</strong> ${escape(e.hear_it)}</p>
  </article>`;
}

function escape(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

input.addEventListener('input', () => render(filterTerms(entries, input.value)));
render(entries);
