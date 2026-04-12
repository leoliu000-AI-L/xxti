const data = window.SBTI_SOURCE_DATA;
const theme = data.theme || {};
const runtimeAvatarLinks = window.XXTI_AVATAR_LINKS || {};
const avatarLinks = { ...(data.typeImages || {}), ...runtimeAvatarLinks };
data.typeImages = avatarLinks;

const RESET_ANIMATION_MS = 2400;

const state = {
  answers: {},
  shuffledQuestions: [],
  activeQuestions: [],
  resetTimer: 0,
};

const screens = {
  intro: document.getElementById('introScreen'),
  test: document.getElementById('testScreen'),
  result: document.getElementById('resultScreen'),
};

const ui = {
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  questionList: document.getElementById('questionList'),
  questionNav: document.getElementById('questionNav'),
  testHint: document.getElementById('testHint'),
  submitBtn: document.getElementById('submitBtn'),
  introLead: document.getElementById('introLead'),
  resultHint: document.getElementById('resultHint'),
  avatarMarquee: document.getElementById('avatarMarquee'),
  resultAvatarWrap: document.getElementById('resultAvatarWrap'),
  resultAvatar: document.getElementById('resultAvatar'),
  resultMode: document.getElementById('resultMode'),
  resultName: document.getElementById('resultName'),
  resultBadge: document.getElementById('resultBadge'),
  resultSub: document.getElementById('resultSub'),
  resultDesc: document.getElementById('resultDesc'),
  topMatches: document.getElementById('topMatches'),
  dimensionList: document.getElementById('dimensionList'),
  resetOverlay: document.getElementById('resetOverlay'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle('hidden', key !== name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('');
}

function getTypeAvatar(code) {
  return avatarLinks[code] || '';
}

function getShowcaseCodes() {
  const regularCodes = Array.isArray(data.normalTypes)
    ? data.normalTypes.map((type) => type.code)
    : [];
  const extraCodes = ['HHHH', 'DRUNK'].filter((code) => data.typeLibrary?.[code]);
  return [...new Set([...regularCodes, ...extraCodes])];
}

function getVisibleQuestions() {
  const visible = [...state.shuffledQuestions];
  const gateIndex = visible.findIndex((question) => question.id === 'drink_gate_q1');
  if (gateIndex !== -1 && state.answers.drink_gate_q1 === 3) {
    visible.splice(gateIndex + 1, 0, data.specialQuestions[1]);
  }
  return visible;
}

function getDrunkTriggered() {
  return state.answers.drink_gate_q1 === 3 && state.answers[data.drunkTriggerQuestionId] === 2;
}

function computeResult() {
  const rawScores = Object.fromEntries(Object.keys(data.dimensionMeta).map((dim) => [dim, 0]));

  state.activeQuestions.forEach((question) => {
    rawScores[question.dim] += Number(state.answers[question.id] || 0);
  });

  const levels = Object.fromEntries(
    Object.entries(rawScores).map(([dim, score]) => [dim, sumToLevel(score)])
  );

  const userVector = data.dimensionOrder.map((dim) => levelNum(levels[dim]));
  const ranked = data.normalTypes
    .map((type) => {
      const vector = parsePattern(type.pattern).map(levelNum);
      let distance = 0;
      let exact = 0;

      for (let i = 0; i < vector.length; i += 1) {
        const diff = Math.abs(userVector[i] - vector[i]);
        distance += diff;
        if (diff === 0) exact += 1;
      }

      const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
      return {
        ...type,
        ...data.typeLibrary[type.code],
        distance,
        exact,
        similarity,
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.exact !== b.exact) return b.exact - a.exact;
      return b.similarity - a.similarity;
    });

  const bestNormal = ranked[0];
  let finalType = bestNormal;
  let mode = theme.defaultModeLabel || 'Primary Type';
  let badge = `${theme.topMatchPrefix || 'Match'} ${bestNormal.similarity}% | ${theme.exactLabel || 'Exact'} ${bestNormal.exact}/15`;
  let sub = theme.defaultResultSub || 'The current result comes from nearest-template matching.';

  if (getDrunkTriggered()) {
    finalType = data.typeLibrary.DRUNK;
    mode = theme.hiddenModeLabel || 'Hidden Type Activated';
    badge = theme.hiddenBadge || 'Match 100% | Hidden branch override';
    sub = theme.hiddenResultSub || 'The hidden branch overrides the normal result.';
  } else if (bestNormal.similarity < 60) {
    finalType = data.typeLibrary.HHHH;
    mode = theme.fallbackModeLabel || 'Fallback Type';
    badge = `${theme.fallbackBadgePrefix || 'Best template only'} ${bestNormal.similarity}%`;
    sub = theme.fallbackResultSub || 'No standard template is close enough, so the fallback type is used.';
  }

  return { rawScores, levels, ranked, finalType, mode, badge, sub };
}

function clearNode(node) {
  while (node && node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function formatTypeLabel(type) {
  if (!type) return '';
  return type.cn ? `${type.code} (${type.cn})` : type.code;
}

function applyImage(img, src, alt, eager = false) {
  img.src = src;
  img.alt = alt;
  img.loading = eager ? 'eager' : 'lazy';
  img.referrerPolicy = 'no-referrer';
}

function questionAnchorId(questionId) {
  return `question-${questionId}`;
}

function resetQuestionUi() {
  clearNode(ui.questionList);
  clearNode(ui.questionNav);
  if (ui.progressBar) {
    ui.progressBar.style.width = '0%';
    ui.progressBar.setAttribute('aria-valuenow', '0');
  }
  if (ui.progressText) ui.progressText.textContent = '0 / 0';
  if (ui.submitBtn) ui.submitBtn.disabled = true;
  if (ui.testHint) {
    ui.testHint.textContent = theme.progressHint || 'The hidden branch adds one extra question.';
  }
}

function resetResultUi() {
  if (ui.resultMode) ui.resultMode.textContent = '-';
  if (ui.resultName) ui.resultName.textContent = '-';
  if (ui.resultBadge) ui.resultBadge.textContent = '-';
  if (ui.resultSub) ui.resultSub.textContent = '-';
  if (ui.resultDesc) ui.resultDesc.textContent = '-';
  if (ui.resultAvatar) {
    ui.resultAvatar.removeAttribute('src');
    ui.resultAvatar.alt = '';
  }
  ui.resultAvatarWrap?.classList.add('hidden');
  clearNode(ui.topMatches);
  clearNode(ui.dimensionList);
}

function resetSession() {
  state.answers = {};
  state.shuffledQuestions = [];
  state.activeQuestions = [];
  resetQuestionUi();
  resetResultUi();
}

function openResetOverlay() {
  if (!ui.resetOverlay) return;
  ui.resetOverlay.classList.remove('hidden');
  ui.resetOverlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    ui.resetOverlay.classList.add('active');
  });
}

function closeResetOverlay() {
  if (!ui.resetOverlay) return;
  ui.resetOverlay.classList.remove('active');
  ui.resetOverlay.classList.add('hidden');
  ui.resetOverlay.setAttribute('aria-hidden', 'true');
}

function playResetTransition() {
  if (state.resetTimer) {
    window.clearTimeout(state.resetTimer);
    state.resetTimer = 0;
  }

  openResetOverlay();
  state.resetTimer = window.setTimeout(() => {
    closeResetOverlay();
    resetSession();
    showScreen('intro');
    state.resetTimer = 0;
  }, RESET_ANIMATION_MS);
}

function renderQuestionNav(visibleQuestions) {
  if (!ui.questionNav) return;
  clearNode(ui.questionNav);

  visibleQuestions.forEach((question, index) => {
    const navButton = makeEl('button', 'question-nav-item', String(index + 1));
    navButton.type = 'button';
    navButton.dataset.questionId = question.id;
    navButton.setAttribute('aria-label', `Jump to question ${index + 1}`);

    if (state.answers[question.id] !== undefined) {
      navButton.classList.add('answered');
    }
    if (question.special) {
      navButton.classList.add('special');
    }

    navButton.addEventListener('click', () => {
      const target = document.getElementById(questionAnchorId(question.id));
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    ui.questionNav.append(navButton);
  });
}

function renderProgress() {
  const visibleQuestions = getVisibleQuestions();
  const total = visibleQuestions.length;
  const done = visibleQuestions.filter((question) => state.answers[question.id] !== undefined).length;
  const percent = total === 0 ? 0 : (done / total) * 100;

  ui.progressBar.style.width = `${percent}%`;
  ui.progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
  ui.progressText.textContent = `${done} / ${total}`;
  ui.submitBtn.disabled = done !== total || total === 0;
  ui.testHint.textContent =
    done === total && total > 0
      ? (theme.completeHint || 'Done. You can view the result now.')
      : (theme.progressHint || 'The hidden branch adds one extra question.');
}

function handleAnswerChange(event) {
  const target = event.currentTarget;
  state.answers[target.name] = Number(target.value);

  if (target.name === 'drink_gate_q1' && Number(target.value) !== 3) {
    delete state.answers.drink_gate_q2;
  }

  renderQuestions();
}

function buildOption(question, option, optionIndex) {
  const label = makeEl('label', 'option');
  const input = document.createElement('input');
  const wrapper = document.createElement('div');
  const letter = makeEl('strong', '', ['A', 'B', 'C', 'D'][optionIndex] || String(optionIndex + 1));
  const text = makeEl('div', '', option.label);

  input.type = 'radio';
  input.name = question.id;
  input.value = String(option.value);
  input.checked = state.answers[question.id] === option.value;
  input.addEventListener('change', handleAnswerChange);

  wrapper.append(letter, text);
  label.append(input, wrapper);
  return label;
}

function renderQuestions() {
  const visibleQuestions = getVisibleQuestions();
  clearNode(ui.questionList);

  visibleQuestions.forEach((question, index) => {
    const meta = question.special
      ? (theme.specialQuestionLabel || 'Hidden Branch')
      : (theme.hideDimensionLabels ? (theme.regularQuestionLabel || 'Question') : data.dimensionMeta[question.dim].name);

    const article = makeEl('article', 'question-card');
    const metaRow = makeEl('div', 'question-meta');
    const order = makeEl('span', '', `${theme.questionPrefix || 'Question'} ${index + 1}${theme.questionSuffix || ''}`);
    const metaText = makeEl('span', '', meta);
    const questionText = makeEl('div', 'question-text', question.text);
    const optionList = makeEl('div', 'option-list');

    article.id = questionAnchorId(question.id);
    metaRow.append(order, metaText);
    question.options.forEach((option, optionIndex) => {
      optionList.append(buildOption(question, option, optionIndex));
    });

    article.append(metaRow, questionText, optionList);
    ui.questionList.append(article);
  });

  renderQuestionNav(visibleQuestions);
  renderProgress();
}

function renderTopMatches(result) {
  clearNode(ui.topMatches);

  result.ranked.slice(0, 3).forEach((item) => {
    const match = makeEl('div', 'match-item');
    const content = makeEl('div', 'match-content');
    const title = makeEl('strong', '', formatTypeLabel(item));
    const meta = makeEl(
      'div',
      'match-meta',
      `${theme.topMatchPrefix || 'Match'} ${item.similarity}% | ${theme.distanceLabel || 'Distance'} ${item.distance} | ${theme.exactLabel || 'Exact'} ${item.exact}/15`
    );
    const avatar = getTypeAvatar(item.code);

    if (avatar) {
      const img = makeEl('img', 'match-avatar');
      applyImage(img, avatar, `${formatTypeLabel(item)} avatar`);
      match.append(img);
    }

    content.append(title, meta);
    match.append(content);
    ui.topMatches.append(match);
  });
}

function renderDimensionList(result) {
  clearNode(ui.dimensionList);

  data.dimensionOrder.forEach((dim) => {
    const level = result.levels[dim];
    const explain = data.dimensionExplanations[dim][level];
    const item = makeEl('div', 'dimension-item');
    const head = makeEl('div', 'dimension-head');
    const title = makeEl('strong', '', data.dimensionMeta[dim].name);
    const score = makeEl('span', 'dimension-score', `${level} / ${result.rawScores[dim]}${theme.scoreUnit || ''}`);
    const desc = makeEl('p', '', explain);

    head.append(title, score);
    item.append(head, desc);
    ui.dimensionList.append(item);
  });
}

function renderResult() {
  const result = computeResult();
  const finalType = result.finalType;
  const finalAvatar = getTypeAvatar(finalType.code);
  const finalLabel = formatTypeLabel(finalType);

  if (ui.resultMode) ui.resultMode.textContent = result.mode;
  if (ui.resultName) ui.resultName.textContent = finalLabel;
  if (ui.resultBadge) ui.resultBadge.textContent = result.badge;
  if (ui.resultSub) ui.resultSub.textContent = result.sub;
  if (ui.resultDesc) ui.resultDesc.textContent = finalType.desc;

  if (ui.resultAvatarWrap && ui.resultAvatar) {
    if (finalAvatar) {
      applyImage(ui.resultAvatar, finalAvatar, `${finalLabel} avatar`, true);
      ui.resultAvatarWrap.classList.remove('hidden');
    } else {
      ui.resultAvatar.removeAttribute('src');
      ui.resultAvatar.alt = '';
      ui.resultAvatarWrap.classList.add('hidden');
    }
  }

  renderTopMatches(result);
  renderDimensionList(result);
  showScreen('result');
}

function startTest() {
  if (ui.resetOverlay?.classList.contains('active')) return;

  state.answers = {};
  const pool = Array.isArray(data.questionPool) ? data.questionPool : (Array.isArray(data.questions) ? data.questions : []);
  const perDimension = data.selection?.perDimension || 0;

  if (perDimension > 0) {
    const grouped = Object.fromEntries(data.dimensionOrder.map((dim) => [dim, []]));
    pool.forEach((question) => {
      if (grouped[question.dim]) grouped[question.dim].push(question);
    });

    state.activeQuestions = data.dimensionOrder.flatMap((dim) => shuffle(grouped[dim] || []).slice(0, perDimension));
  } else {
    state.activeQuestions = [...pool];
  }

  const shuffledRegular = shuffle(state.activeQuestions);
  const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1;
  state.shuffledQuestions = [
    ...shuffledRegular.slice(0, insertIndex),
    data.specialQuestions[0],
    ...shuffledRegular.slice(insertIndex),
  ];

  renderQuestions();
  showScreen('test');
}

function buildAvatarCard(item) {
  const card = makeEl('article', 'avatar-card');
  const img = makeEl('img');
  const meta = makeEl('div', 'avatar-card-meta');
  const code = makeEl('strong', '', item.code);
  const name = makeEl('span', '', item.cn);

  applyImage(img, item.avatar, `${formatTypeLabel(item)} avatar`);
  meta.append(code, name);
  card.append(img, meta);
  return card;
}

function renderAvatarMarquee() {
  if (!ui.avatarMarquee) return;

  const items = getShowcaseCodes()
    .map((code) => ({
      code,
      cn: data.typeLibrary?.[code]?.cn || code,
      avatar: getTypeAvatar(code),
    }))
    .filter((item) => item.avatar);

  if (!items.length) {
    ui.avatarMarquee.classList.add('hidden');
    clearNode(ui.avatarMarquee);
    return;
  }

  ui.avatarMarquee.classList.remove('hidden');
  clearNode(ui.avatarMarquee);

  const splitAt = Math.ceil(items.length / 2);
  const rows = [items.slice(0, splitAt), items.slice(splitAt)].filter((row) => row.length);

  rows.forEach((row, idx) => {
    const track = makeEl('div', `avatar-track${idx % 2 === 1 ? ' reverse' : ''}`);
    const inner = makeEl('div', 'avatar-track-inner');

    row.forEach((item) => {
      inner.append(buildAvatarCard(item));
    });
    row.forEach((item) => {
      inner.append(buildAvatarCard(item));
    });

    track.append(inner);
    ui.avatarMarquee.append(track);
  });
}

function initCopy() {
  if (ui.introLead && theme.introLead) {
    ui.introLead.textContent = theme.introLead;
  }

  if (ui.resultHint && theme.resultHint) {
    ui.resultHint.textContent = theme.resultHint;
  }

  if (ui.progressBar) {
    ui.progressBar.setAttribute('role', 'progressbar');
    ui.progressBar.setAttribute('aria-valuemin', '0');
    ui.progressBar.setAttribute('aria-valuemax', '100');
    ui.progressBar.setAttribute('aria-valuenow', '0');
  }

  ui.resetOverlay?.setAttribute('aria-hidden', 'true');
  resetQuestionUi();
}

document.getElementById('startBtn')?.addEventListener('click', startTest);
document.getElementById('restartSeedBtn')?.addEventListener('click', playResetTransition);
document.getElementById('backBtn')?.addEventListener('click', () => showScreen('intro'));
document.getElementById('submitBtn')?.addEventListener('click', renderResult);
document.getElementById('resetBtn')?.addEventListener('click', playResetTransition);
document.getElementById('homeBtn')?.addEventListener('click', () => showScreen('intro'));

initCopy();
renderAvatarMarquee();
