
"use strict";

/* =========================================================
   QADAM AI — интерактивность frontend-прототипа
   Только синтетические данные, без внешних API и сервера.
   ========================================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const topics = ["Переменные", "Условия", "Циклы", "Массивы", "Функции"];
const topicKeys = ["variables", "conditions", "loops", "arrays", "functions"];
const topicColors = ["bar-blue", "bar-mint", "bar-purple", "bar-yellow", "bar-pink"];
const topicIcons = ["⌘", "⑂", "↻", "▦", "ƒ"];
const topicAverages = [94, 86, 78, 57, 69];

const lectureData = [
  { id: 1, title: "Введение в программирование", icon: "⌘", cover: "cover-purple", count: "4 материала", description: "Основные понятия и знакомство с Python." },
  { id: 2, title: "Переменные", icon: "x = 5", cover: "cover-blue", count: "4 материала", description: "Типы данных, присваивание и выражения." },
  { id: 3, title: "Циклы", icon: "↻", cover: "cover-mint", count: "4 материала", description: "Циклы for и while, повторение действий." },
  { id: 4, title: "Массивы", icon: "[ ]", cover: "cover-pink", count: "4 материала", description: "Создание массивов, индексы и операции." },
  { id: 5, title: "Функции", icon: "ƒ(x)", cover: "cover-yellow", count: "4 материала", description: "Параметры, аргументы и возвращаемые значения." }
];

const firstNames = [
  "Александр", "Алина", "Данияр", "Мария", "Тимур", "София",
  "Арман", "Елизавета", "Нурлан", "Диана", "Максим", "Амина",
  "Илья", "Виктория", "Дамир", "Полина", "Ерлан", "Анна",
  "Руслан", "Мадина", "Кирилл", "Аружан", "Матвей", "Камила",
  "Артём", "Сабина", "Михаил", "Аяулым", "Денис", "Милана",
  "Роман", "Жанель"
];

const demoNames = firstNames.map((name, i) => ({
  id: i + 1,
  name,
  code: `ИС-24-${String(i + 1).padStart(2, "0")}`,
  scores: makeScores(i)
}));

function makeScores(i) {
  // Разные сочетания навыков создают правдоподобную демокарту.
  const patterns = [
    [96, 91, 66, 35, 58],
    [90, 88, 78, 62, 70],
    [95, 85, 82, 48, 74],
    [88, 80, 73, 55, 64],
    [99, 94, 91, 82, 87],
    [84, 78, 68, 41, 53],
    [92, 87, 77, 58, 70],
    [98, 96, 89, 79, 91],
    [86, 82, 70, 52, 61],
    [94, 90, 83, 63, 77],
    [80, 72, 61, 37, 49],
    [97, 91, 87, 73, 82]
  ];
  const pattern = patterns[i % patterns.length];
  const offset = Math.floor(i / patterns.length) * 2;
  return pattern.map((value, j) =>
    Math.max(25, Math.min(100, value + ((i * (j + 3)) % 7) - 3 + offset))
  );
}

const state = {
  currentPage: "overview",
  studentQuery: "",
  studentFilter: "all",
  selectedStudent: null,
  file: null,
  fileText: null,
  fileKind: null,
  copilotBusy: false,
  chatHistory: [],
  toastId: 0,
  analysisId: 0
};

function average(scores) {
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getSkillStatus(score) {
  if (score >= 75) return "good";
  if (score >= 50) return "practice";
  return "attention";
}

function getStatusLabel(status) {
  return {
    good: "Освоено",
    practice: "Необходимо закрепить",
    attention: "Требует внимания"
  }[status] || "Необходимо закрепить";
}

function getStudentStatus(student) {
  const scores = student.scores;
  if (scores.some(score => score < 50)) return "attention";
  if (scores.some(score => score < 75)) return "practice";
  return "good";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showToast(title, message = "") {
  const container = $("#toastContainer");
  const toast = document.createElement("div");
  const id = ++state.toastId;

  toast.className = "toast";
  toast.dataset.toastId = String(id);

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = "✓";

  const content = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  content.appendChild(heading);

  if (message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    content.appendChild(paragraph);
  }

  toast.append(icon, content);
  container.appendChild(toast);

  window.setTimeout(() => toast.remove(), 3800);
}

/* ---------------------------------------------------------
   Навигация SPA
   --------------------------------------------------------- */

const pageTitles = {
  overview: "Обзор",
  students: "Студенты",
  lectures: "Лекции",
  tests: "Тесты и задания",
  knowledge: "Карта знаний",
  routes: "Маршруты"
};

function navigateTo(pageId) {
  const page = $(`#page-${pageId}`);
  if (!page) return;

  state.currentPage = pageId;

  $$(".page").forEach(section => {
    section.classList.toggle("active", section.id === `page-${pageId}`);
  });

  $$(".nav-item[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  $("#breadcrumbTitle").textContent = pageTitles[pageId] || "Обзор";
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "students") renderStudents();
  if (pageId === "knowledge") renderHeatmap();

  document.title = `${pageTitles[pageId] || "Обзор"} — Qadam AI`;
}

function closeMobileMenu() {
  $("#sidebar").classList.remove("open");
  $("#mobileOverlay").classList.remove("open");
}

$("#mobileMenu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
  $("#mobileOverlay").classList.toggle("open");
});
$("#mobileOverlay").addEventListener("click", closeMobileMenu);

$$("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigateTo(button.dataset.page));
});

$$("[data-action]").forEach(button => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

$("#profileMenu").addEventListener("click", () => {
  showToast("Профиль преподавателя", "Демонстрационный профиль: Анна Петрова.");
});

$("#notifications").addEventListener("click", () => {
  showToast("Уведомления", "Новых уведомлений в демонстрационном режиме нет.");
});

/* ---------------------------------------------------------
   Обзор и карточки лекций
   --------------------------------------------------------- */

function renderMastery() {
  $("#masteryList").innerHTML = topicAverages.map((score, index) => `
    <div class="mastery-row">
      <span class="mastery-name">${topics[index]}</span>
      <div class="mastery-track" role="progressbar"
        aria-label="${topics[index]}" aria-valuemin="0" aria-valuemax="100"
        aria-valuenow="${score}">
        <span class="${topicColors[index]}" style="width:${score}%"></span>
      </div>
      <span class="mastery-value ${score < 65 ? "low" : score >= 80 ? "good" : ""}">${score}%</span>
    </div>
  `).join("");
}

function renderRecentLectures() {
  $("#recentLectures").innerHTML = lectureData.slice(0, 3).map(lecture => `
    <button class="mini-lecture" data-lecture="${lecture.id}">
      <span class="mini-lecture-art ${lecture.cover}">${lecture.icon}</span>
      <span><strong>${lecture.title}</strong><p>${lecture.count}</p></span>
      <span class="mini-arrow">↗</span>
    </button>
  `).join("");

  $$(".mini-lecture").forEach(button => {
    button.addEventListener("click", () => {
      navigateTo("lectures");
      showToast("Материалы курса", "Выберите нужный материал в библиотеке лекций.");
    });
  });
}

function renderLectures() {
  $("#lectureGrid").innerHTML = lectureData.map(lecture => `
    <article class="lecture-card">
      <div class="lecture-cover ${lecture.cover}">
        <span class="lecture-number">QADAM / 0${lecture.id}</span>
        <h3>${lecture.title}</h3>
        <span class="lecture-cover-art">${lecture.icon}</span>
        <span class="cover-decoration"></span>
      </div>
      <div class="lecture-card-body">
        ${lecture.id === 4 ? `
          <div class="lecture-warning">✦ Требуется дополнительный материал</div>
        ` : ""}
        <div class="material-label">МАТЕРИАЛЫ ТЕМЫ</div>
        <div class="material-list">
          <div class="material-item"><span>▤</span> Презентация <em>✓</em></div>
          <div class="material-item"><span>▧</span> Конспект <em>✓</em></div>
          <div class="material-item"><span>☑</span> Тест <em>✓</em></div>
          <div class="material-item"><span>✎</span> Практика <em>✓</em></div>
        </div>
        <div class="lecture-card-footer">
          <span>${lecture.count}</span>
          <button class="text-button" data-lecture-action="${lecture.id}">
            ${lecture.id === 4 ? "✦ Доработать с Copilot" : "Открыть тему →"}
          </button>
        </div>
      </div>
    </article>
  `).join("");

  $$("[data-lecture-action]").forEach(button => {
    button.addEventListener("click", () => {
      const lecture = lectureData.find(item => item.id === Number(button.dataset.lectureAction));
      if (!lecture) return;
      if (lecture.id === 4) {
        openCopilot();
        runPrompt("lecture", `Подготовь дополнительный материал по теме «${lecture.title}» для студентов первого курса.`);
      } else {
        showModal({
          title: lecture.title,
          subtitle: lecture.description,
          body: `
            <div class="modal-step-list">
              ${["Презентация", "Конспект", "Тест для самопроверки", "Практическая работа"].map((name, i) => `
                <div class="modal-step"><span>${i + 1}</span><div>
                  <strong>${name}</strong>
                  <p>Демонстрационный материал курса. Можно подготовить или доработать с Copilot.</p>
                </div></div>`).join("")}
            </div>
          `
        });
      }
    });
  });
}

/* ---------------------------------------------------------
   Таблица студентов и фильтры
   --------------------------------------------------------- */

function renderStudents() {
  const query = state.studentQuery.trim().toLocaleLowerCase("ru");
  const filtered = demoNames.filter(student => {
    const matchesQuery = student.name.toLocaleLowerCase("ru").includes(query) ||
      student.code.toLocaleLowerCase("ru").includes(query);

    const status = getStudentStatus(student);
    const matchesFilter = state.studentFilter === "all" ||
      status === state.studentFilter;

    return matchesQuery && matchesFilter;
  });

  $("#studentCount").textContent = `${filtered.length} ${pluralStudents(filtered.length)}`;

  if (!filtered.length) {
    $("#studentTableBody").innerHTML = `
      <tr><td colspan="8" style="padding:30px;text-align:center;color:#8B90A8">
        Ничего не найдено. Измените запрос или фильтр.
      </td></tr>`;
    return;
  }

  $("#studentTableBody").innerHTML = filtered.map(student => {
    const overall = average(student.scores);
    const avatar = student.name.split(" ").map(part => part[0]).slice(0, 2).join("");

    return `
      <tr>
        <td><div class="student-name-cell">
          <span class="student-avatar">${escapeHTML(avatar)}</span>
          <span><span class="student-name-text">Студент ${String(student.id).padStart(2, "0")}</span>
          <span class="student-subtext">${escapeHTML(student.code)}</span></span>
        </div></td>
        <td><span class="student-overall">${overall}%</span></td>
        ${student.scores.map(score => {
          const status = getSkillStatus(score);
          return `<td><span class="skill-pill ${status}" title="${score}% — ${getStatusLabel(status)}"><i></i>${getStatusLabel(status)}</span></td>`;
        }).join("")}
        <td><button class="text-button" data-student-route="${student.id}">Следующий шаг ↗</button></td>
      </tr>`;
  }).join("");

  $$("[data-student-route]").forEach(button => {
    button.addEventListener("click", () => {
      const student = demoNames.find(item => item.id === Number(button.dataset.studentRoute));
      if (student) openStudentRoute(student);
    });
  });
}

function pluralStudents(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "студентов";
  if (last === 1) return "студент";
  if (last >= 2 && last <= 4) return "студента";
  return "студентов";
}

$("#studentSearch").addEventListener("input", event => {
  state.studentQuery = event.target.value;
  renderStudents();
});

$("#studentFilter").addEventListener("change", event => {
  state.studentFilter = event.target.value;
  renderStudents();
});

$("#resetStudentFilters").addEventListener("click", () => {
  state.studentQuery = "";
  state.studentFilter = "all";
  $("#studentSearch").value = "";
  $("#studentFilter").value = "all";
  renderStudents();
  showToast("Фильтры сброшены", "Отображаются все демонстрационные профили.");
});

/* ---------------------------------------------------------
   Персональный маршрут и модальные окна
   --------------------------------------------------------- */

function openStudentRoute(student) {
  state.selectedStudent = student;

  const needs = student.scores
    .map((score, index) => ({ score, index }))
    .filter(item => item.score < 75)
    .sort((a, b) => a.score - b.score);

  const focus = needs.length ? needs[0] : { index: 3, score: student.scores[3] };
  const focusTopic = topics[focus.index];

  showModal({
    title: "Персональный следующий шаг",
    subtitle: `Демонстрационный маршрут для профиля «Студент ${String(student.id).padStart(2, "0")}».`,
    body: `
      <div class="route-student-summary">
        <span class="student-avatar">${String(student.id).padStart(2, "0")}</span>
        <div><strong>Студент ${String(student.id).padStart(2, "0")}</strong>
          <p>Общее освоение: ${average(student.scores)}% · Фокус: ${focusTopic}</p></div>
      </div>
      <div class="modal-step-list">
        <div class="modal-step"><span>1</span><div><strong>Повторить тему «${focusTopic}»</strong>
          <p>Короткое объяснение и один наглядный пример.</p></div></div>
        <div class="modal-step"><span>2</span><div><strong>Выполнить практическое задание</strong>
          <p>Начать с пошагового упражнения и перейти к самостоятельной задаче.</p></div></div>
        <div class="modal-step"><span>3</span><div><strong>Проверить понимание</strong>
          <p>Пройти мини-тест и скорректировать дальнейший маршрут по результату.</p></div></div>
      </div>
      <p style="margin-top:16px;color:#969BB0;font-size:10px;line-height:1.7">
        Рекомендация основана на синтетических данных и требует проверки преподавателем.
      </p>
    `,
    copilotPrompt: `Предложи персональный учебный маршрут по теме «${focusTopic}» для студента первого курса. Уровень освоения темы в демонстрационном примере — ${focus.score}%. Не используй ярлыки, предложи объяснение, практику и повторную проверку.`
  });
}

function showModal({ title, subtitle, body, copilotPrompt = "" }) {
  const overlay = $("#modalOverlay");
  $("#modalTitle").textContent = title;
  $("#modalSubtitle").textContent = subtitle || "";
  $("#modalBody").innerHTML = body || "";
  overlay.dataset.copilotPrompt = copilotPrompt;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $("#closeModal").focus();
}

function closeModal() {
  $("#modalOverlay").classList.remove("open");
  $("#modalOverlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("#closeModal").addEventListener("click", closeModal);
$("#modalCloseButton").addEventListener("click", closeModal);
$("#modalOverlay").addEventListener("click", event => {
  if (event.target === $("#modalOverlay")) closeModal();
});

$("#modalCopilotButton").addEventListener("click", () => {
  const prompt = $("#modalOverlay").dataset.copilotPrompt;
  closeModal();
  openCopilot();
  if (prompt) runPrompt("custom", prompt);
  else runPrompt("plan");
});

/* ---------------------------------------------------------
   Heatmap
   --------------------------------------------------------- */

function renderHeatmap() {
  const visible = demoNames.slice(0, 12);
  const table = $("#heatmapTable");

  table.innerHTML = `
    <thead><tr><th>УЧЕБНЫЙ ПРОФИЛЬ</th>
      ${topics.map(topic => `<th>${topic}</th>`).join("")}
    </tr></thead>
    <tbody>${visible.map(student => `
      <tr><td>Студент ${String(student.id).padStart(2, "0")}</td>
      ${student.scores.map((score, index) => {
        const status = getSkillStatus(score);
        const recommendation = score >= 75
          ? "Предложить более сложное задание или применить навык в новом контексте."
          : score >= 50
            ? "Закрепить тему на практических примерах и проверить понимание."
            : "Начать с простого объяснения, разобрать пример и провести повторную диагностику.";

        return `<td><button class="heat-cell heat-${status}"
          data-heat-student="${student.id}" data-heat-topic="${index}"
          title="${score}% · ${topics[index]} · ${getStatusLabel(status)}"
          aria-label="Студент ${student.id}, ${topics[index]}, ${score} процентов">
          ${score}%
        </button></td>`;
      }).join("")}</tr>
    `).join("")}</tbody>`;

  $$("[data-heat-student]").forEach(button => {
    const student = demoNames.find(item => item.id === Number(button.dataset.heatStudent));
    const topicIndex = Number(button.dataset.heatTopic);
    const score = student.scores[topicIndex];
    const status = getSkillStatus(score);
    const recommendation = score >= 75
      ? "Предложить более сложное задание или применить навык в новом контексте."
      : score >= 50
        ? "Закрепить тему на практических примерах и проверить понимание."
        : "Начать с простого объяснения, разобрать пример и провести повторную диагностику.";

    button.addEventListener("click", () => {
      showModal({
        title: topics[topicIndex],
        subtitle: `Студент ${String(student.id).padStart(2, "0")} · детализация ячейки карты знаний`,
        body: `
          <div class="route-student-summary">
            <span class="stat-icon ${score >= 75 ? "icon-mint" : score >= 50 ? "icon-yellow" : "icon-pink"}">${score}%</span>
            <div><strong>${getStatusLabel(status)}</strong>
              <p>Тема: ${topics[topicIndex]}</p></div>
          </div>
          <div class="modal-step-list">
            <div class="modal-step"><span>✦</span><div><strong>Рекомендуемый следующий шаг</strong>
              <p>${recommendation}</p></div></div>
          </div>`,
        copilotPrompt: `Подготовь следующий учебный шаг по теме «${topics[topicIndex]}». Текущий результат демонстрационного профиля — ${score}%. Рекомендация: ${recommendation}`
      });
    });
  });

  $("#knowledgeTopics").innerHTML = topicAverages.map((score, index) => `
    <div class="knowledge-topic">
      <span>${topics[index]}</span>
      <div class="mastery-track"><span class="${topicColors[index]}" style="width:${score}%"></span></div>
      <strong style="color:${score < 65 ? "#B48732" : "#3D8D70"}">${score}%</strong>
    </div>`).join("");
}

/* ---------------------------------------------------------
   Copilot — демонстрационный чат
   --------------------------------------------------------- */

const promptDefinitions = {
  presentation: {
    user: "Создай презентацию по теме «Массивы в Python» для студентов первого курса.",
    heading: "Структура презентации",
    intro: "Готово. Предлагаю структуру презентации из 10 слайдов.",
    items: [
      "Цели занятия", "Что такое массив", "Работа с индексами",
      "Создание массива", "Основные операции", "Практический пример",
      "Типичные ошибки", "Работа в парах", "Мини-задание", "Итоги"
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  lecture: {
    user: "Подготовь учебный материал по теме «Массивы в Python» для студентов первого курса.",
    heading: "План лекции",
    intro: "Предлагаю план лекции с объяснением понятий, примерами и проверкой понимания.",
    items: [
      "Цели и результаты обучения",
      "Понятие массива и списка в Python",
      "Индексы и доступ к элементам",
      "Создание и изменение списка",
      "Перебор элементов",
      "Типичные ошибки",
      "Разбор примеров",
      "Вопросы для самопроверки"
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  plan: {
    user: "Составь план занятия по теме «Массивы в Python» на 80 минут.",
    heading: "План занятия · 80 минут",
    intro: "Предлагаю сбалансировать объяснение, практику и диагностику.",
    items: [
      "10 мин — входная диагностика",
      "20 мин — объяснение",
      "25 мин — практика",
      "15 мин — индивидуальная работа",
      "10 мин — повторная проверка"
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  test: {
    user: "Создай короткий тест по теме «Массивы в Python» для первого курса.",
    heading: "Мини-тест · 5 вопросов",
    intro: "Предлагаю проверить понимание индексов, доступа к элементам и основных операций.",
    items: [
      "Что такое индекс элемента?",
      "Как обратиться к первому элементу списка в Python?",
      "Как узнать длину списка?",
      "Как добавить элемент в список?",
      "Что произойдёт при обращении к несуществующему индексу?"
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  levels: {
    user: "Создай задания трёх уровней по теме «Массивы в Python».",
    heading: "Три уровня заданий",
    intro: "Задания различаются объёмом поддержки и самостоятельностью.",
    items: [
      "🟢 Продвинутый — прикладной кейс: обработать массив данных и объяснить выбранный алгоритм.",
      "🟡 Базовый — самостоятельная практика: создать список, изменить элементы и найти нужное значение.",
      "🔴 Поддержка — объяснение + пример + пошаговое задание с подсказками."
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  analysis: {
    user: "Проанализируй результаты группы и предложи следующие учебные шаги.",
    heading: "Демонстрационный анализ",
    intro: "В учебном примере стоит уделить внимание теме «Массивы».",
    items: [
      "3 профиля — рекомендуется индивидуально проверить затруднения",
      "7 профилей — полезна дополнительная практика",
      "Главная зона внимания — массивы",
      "Следующий шаг — объяснение, практическое задание и повторная диагностика"
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  explain: {
    user: "Объясни тему «Массивы в Python» простыми словами для начинающих.",
    heading: "Объяснение простыми словами",
    intro: "Представь список как ряд пронумерованных ячеек. В каждой ячейке хранится значение.",
    items: [
      "Создание: fruits = ['яблоко', 'груша', 'слива']",
      "Индексы начинаются с нуля: fruits[0] — это «яблоко».",
      "Длина списка: len(fruits)",
      "Добавление элемента: fruits.append('банан')",
      "Практика: выведи второй элемент списка и объясни, почему используется индекс 1."
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  practice: {
    user: "Создай практическую работу по теме «Массивы в Python» для первого курса.",
    heading: "Практическая работа",
    intro: "Цель — научиться создавать списки, обращаться к элементам и выполнять простые операции.",
    items: [
      "Задание 1. Создать список из пяти чисел.",
      "Задание 2. Вывести первый, последний и третий элементы.",
      "Задание 3. Добавить число и удалить один элемент.",
      "Задание 4. Найти сумму всех чисел.",
      "Критерий результата: код запускается, индексы выбраны правильно, решение объяснено."
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  },
  feedback: {
    user: "Подготовь поддерживающую обратную связь по теме «Массивы».",
    heading: "Пример обратной связи",
    intro: "Сосредоточимся на конкретном навыке и понятном действии.",
    items: [
      "Ты уже сделал важный шаг — попробовал работать со списками.",
      "Следующий навык для закрепления — обращение к элементам по индексу.",
      "Начни с короткого примера, затем выполни похожее задание самостоятельно.",
      "После практики проверь результат с помощью мини-теста."
    ],
    actions: ["Отредактировать", "Использовать", "Создать другой вариант"]
  }
};

function openCopilot() {
  const drawer = $("#copilotDrawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  $("#copilotScrim").classList.add("open");
  $("#floatingCopilot").style.visibility = "hidden";
  document.body.style.overflow = "hidden";

  window.setTimeout(() => $("#copilotInput").focus(), 280);
}

function closeCopilot() {
  $("#copilotDrawer").classList.remove("open");
  $("#copilotDrawer").setAttribute("aria-hidden", "true");
  $("#copilotScrim").classList.remove("open");
  $("#floatingCopilot").style.visibility = "visible";
  document.body.style.overflow = "";
}

$("#closeCopilot").addEventListener("click", closeCopilot);
$("#copilotScrim").addEventListener("click", closeCopilot);

function addChatMessage(role, text, options = {}) {
  const messages = $("#chatMessages");
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const meta = document.createElement("span");
  meta.className = "message-meta";
  meta.textContent = role === "user" ? "Вы · сейчас" : "Copilot · демо";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  // Пользовательский текст вставляется через textContent, не как HTML.
  if (role === "user") {
    bubble.textContent = text;
  } else if (options.definition) {
    const def = options.definition;

    const tag = document.createElement("span");
    tag.className = "answer-tag";
    tag.textContent = "✦ ДЕМОНСТРАЦИОННЫЙ ОТВЕТ";

    const heading = document.createElement("h4");
    heading.textContent = def.heading;

    const intro = document.createElement("p");
    intro.textContent = def.intro;

    bubble.append(tag, heading, intro);

    if (def.items && def.items.length) {
      const list = document.createElement("ol");
      def.items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      bubble.appendChild(list);
    }

    if (def.actions) {
      const actions = document.createElement("div");
      actions.className = "answer-actions";

      def.actions.forEach(action => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action;
        button.addEventListener("click", () => handleAnswerAction(action, def));
        actions.appendChild(button);
      });

      bubble.appendChild(actions);
    }
  } else {
    bubble.textContent = text;
  }

  wrapper.append(meta, bubble);
  messages.appendChild(wrapper);
  $("#copilotChat").scrollTop = $("#copilotChat").scrollHeight;
  return wrapper;
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant";
  wrapper.id = "typingIndicator";

  const meta = document.createElement("span");
  meta.className = "message-meta";
  meta.textContent = "Copilot";

  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  bubble.setAttribute("aria-label", "Copilot готовит материал");

  for (let i = 0; i < 3; i++) {
    bubble.appendChild(document.createElement("span"));
  }

  wrapper.append(meta, bubble);
  $("#chatMessages").appendChild(wrapper);
  $("#copilotChat").scrollTop = $("#copilotChat").scrollHeight;
}

function hideTyping() {
  $("#typingIndicator")?.remove();
}

function runPrompt(key, customText = "") {
  if (state.copilotBusy) {
    showToast("Copilot занят", "Дождитесь завершения текущего демонстрационного ответа.");
    return;
  }

  const def = promptDefinitions[key];
  const userText = customText || (def ? def.user : "");

  if (!userText.trim()) return;

  $("#copilotWelcome").hidden = true;
  $("#quickActionsLabel").hidden = true;
  $("#quickActions").hidden = true;

  state.copilotBusy = true;
  $("#sendCopilot").disabled = true;

  addChatMessage("user", userText);
  showTyping();

  // Имитация генерации, а не реальный вызов AI API.
  window.setTimeout(() => {
    hideTyping();

    if (def) {
      addChatMessage("assistant", "", { definition: def });
    } else {
      addChatMessage("assistant",
        "Это демонстрация Qadam AI. Я могу показать структуру учебного материала, план занятия или последовательность практических шагов. Для содержательной генерации на основе вашего запроса потребуется подключить авторизованную AI-службу.");
    }

    state.copilotBusy = false;
    $("#sendCopilot").disabled = false;
    $("#copilotInput").focus();
    $("#copilotChat").scrollTop = $("#copilotChat").scrollHeight;
  }, 1150);
}

function handleAnswerAction(action, definition) {
  if (action === "Отредактировать") {
    $("#copilotInput").value = `Предложи, как улучшить материал «${definition.heading}». Сделай его понятнее и практичнее.`;
    $("#copilotInput").focus();
    showToast("Материал готов к уточнению", "Измените запрос или отправьте его Copilot.");
  } else if (action === "Использовать") {
    showToast("Материал выбран", "В реальной версии здесь можно будет сохранить его в библиотеку курса.");
  } else if (action === "Создать другой вариант") {
    const key = Object.keys(promptDefinitions).find(
      item => promptDefinitions[item] === definition
    );
    if (key) runPrompt(key, `Создай альтернативный вариант: ${definition.user}`);
  }
}

$$("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => runPrompt(button.dataset.prompt));
});

$("#copilotForm").addEventListener("submit", event => {
  event.preventDefault();
  const text = $("#copilotInput").value.trim();
  if (!text) return;

  $("#copilotInput").value = "";
  runPrompt("custom", text);
});

$("#copilotInput").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("#copilotForm").requestSubmit();
  }
});

/* ---------------------------------------------------------
   Загрузка CSV / JSON / Excel
   Файл читается только в памяти текущей вкладки.
   Excel без отдельной библиотеки не разбирается.
   --------------------------------------------------------- */

const dropZone = $("#dropZone");
const fileInput = $("#fileInput");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

["dragenter", "dragover"].forEach(name => {
  dropZone.addEventListener(name, event => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "dragend"].forEach(name => {
  dropZone.addEventListener(name, () => dropZone.classList.remove("dragging"));
});

dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  if (event.dataTransfer.files[0]) selectFile(event.dataTransfer.files[0]);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) selectFile(fileInput.files[0]);
});

function selectFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const allowed = ["csv", "json", "xlsx", "xls"];

  if (!allowed.includes(extension)) {
    showToast("Формат не поддерживается", "Выберите CSV, JSON, XLS или XLSX.");
    fileInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("Файл слишком большой", "Для демо доступен размер до 10 МБ.");
    fileInput.value = "";
    return;
  }

  state.analysisId++;
  state.file = file;
  state.fileText = null;
  state.fileKind = extension;

  $("#selectedFile").hidden = false;
  $("#selectedFile").textContent =
    `✓ ${file.name} · ${(file.size / 1024).toFixed(1)} КБ`;

  $("#analyzeButton").disabled = false;
  $("#analysisResult").hidden = true;
  resetAnalysisSteps();
  $("#analysisCaption").textContent = "Файл выбран. Можно запустить демонстрацию анализа.";

  showToast("Файл выбран", "Файл остаётся локально в этой вкладке браузера.");
}

function resetAnalysisSteps() {
  $$(".analysis-step").forEach(step => {
    step.classList.remove("done", "running");
    $("i", step).textContent = "○";
  });
  $("#analysisProgress").style.width = "0%";
}

function readFileLocally(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsText(file, "UTF-8");
  });
}

function parseCSV(text) {
  // Поддержка простых CSV с запятой или точкой с запятой.
  // Для сложных CSV с многострочными полями нужен полноценный парсер.
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];

  const delimiter = (lines[0].match(/;/g) || []).length >
    (lines[0].match(/,/g) || []).length ? ";" : ",";

  return lines.map(line => {
    const cells = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  });
}

async function analyzeSelectedFile() {
  if (!state.file) return;

  const runId = state.analysisId;
  const file = state.file;
  const extension = state.fileKind;

  $("#analyzeButton").disabled = true;
  $("#analysisResult").hidden = true;
  resetAnalysisSteps();

  $("#analysisCaption").textContent = "Copilot анализирует результаты...";
  showToast("Начат демонстрационный анализ", "Обработка выполняется в текущей вкладке.");

  let parsedData = null;
  let parseMessage = "";

  try {
    if (extension === "csv" || extension === "json") {
      state.fileText = await readFileLocally(file);
      if (runId !== state.analysisId) return;

      if (extension === "csv") {
        parsedData = parseCSV(state.fileText);
        parseMessage = `CSV прочитан локально: ${parsedData.length} строк.`;
      } else {
        parsedData = JSON.parse(state.fileText);
        parseMessage = "JSON прочитан локально и синтаксически проверен.";
      }
    } else {
      // Без внешней библиотеки Excel здесь намеренно не разбирается.
      parseMessage = "Excel выбран. Для настоящего разбора XLS/XLSX потребуется локальная библиотека.";
    }
  } catch (error) {
    if (runId !== state.analysisId) return;
    $("#analyzeButton").disabled = false;
    $("#analysisCaption").textContent = "Не удалось разобрать файл.";
    showToast("Ошибка чтения файла", extension === "json"
      ? "Проверьте синтаксис JSON."
      : "Не удалось прочитать CSV. Проверьте кодировку и формат.");
    return;
  }

  const steps = $$(".analysis-step");
  const captions = [
    "Анализ ответов...",
    "Определение сложных тем...",
    "Поиск повторяющихся затруднений...",
    "Подготовка рекомендаций..."
  ];

  for (let i = 0; i < steps.length; i++) {
    if (runId !== state.analysisId) return;

    steps[i].classList.add("running");
    $("i", steps[i]).textContent = "◌";
    $("#analysisCaption").textContent = captions[i];
    $("#analysisProgress").style.width = `${i * 25}%`;

    await new Promise(resolve => window.setTimeout(resolve, 500));
    if (runId !== state.analysisId) return;

    steps[i].classList.remove("running");
    steps[i].classList.add("done");
    $("i", steps[i]).textContent = "✓";
    $("#analysisProgress").style.width = `${(i + 1) * 25}%`;
  }

  // В этой концепции цифры ниже — заранее заданный сценарий демо.
  // Загруженное содержимое не используется для выставления оценок.
  $("#resultAttention").textContent = "3";
  $("#resultPractice").textContent = "7";
  $("#analysisSource").textContent = extension === "xls" || extension === "xlsx"
    ? "Сценарий демо · содержимое Excel не разобрано"
    : "Сценарий демо · " + parseMessage;

  $("#analysisResult").hidden = false;
  $("#analysisCaption").textContent =
    "Демонстрационный сценарий завершён. Данные не отправлялись на сервер.";
  $("#analyzeButton").disabled = false;

  showToast("Демо-анализ завершён", "Результаты показаны как пример интерфейса.");
}

$("#analyzeButton").addEventListener("click", analyzeSelectedFile);

/* ---------------------------------------------------------
   Действия приложения
   --------------------------------------------------------- */

function handleAction(action) {
  switch (action) {
    case "open-copilot":
      openCopilot();
      break;

    case "create-review":
      openCopilot();
      runPrompt("practice",
        "Создай короткое повторение по теме «Массивы в Python»: простое объяснение, практическое задание и мини-проверка для студентов первого курса.");
      break;

    case "lecture-copilot":
      openCopilot();
      runPrompt("lecture");
      break;

    case "route-material":
      showModal({
        title: "Материал: массивы",
        subtitle: "Демонстрационный учебный материал",
        body: `
          <div class="modal-step-list">
            <div class="modal-step"><span>1</span><div><strong>Что такое массив?</strong><p>Последовательность элементов, к которым можно обращаться по индексу.</p></div></div>
            <div class="modal-step"><span>2</span><div><strong>Пример в Python</strong><p>numbers = [10, 20, 30]. Первый элемент находится по индексу 0.</p></div></div>
            <div class="modal-step"><span>3</span><div><strong>Проверь понимание</strong><p>Как получить значение 20? Подумай, какой индекс нужно указать.</p></div></div>
          </div>`,
        copilotPrompt: "Создай понятный учебный материал с примерами по теме «Массивы в Python»."
      });
      break;

    case "route-tasks":
      openCopilot();
      runPrompt("practice");
      break;

    case "route-test":
      openCopilot();
      runPrompt("test");
      break;

    case "route-personalize":
      openCopilot();
      runPrompt("plan",
        "Персонализируй учебный маршрут по теме «Массивы»: повторение, практика и повторная диагностика.");
      break;
  }
}

/* ---------------------------------------------------------
   Клавиатура и начальная отрисовка
   --------------------------------------------------------- */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
    closeCopilot();
    closeMobileMenu();
  }

  // Ctrl/Cmd + K — переход к поиску студентов.
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    navigateTo("students");
    $("#studentSearch").focus();
  }
});

renderMastery();
renderRecentLectures();
renderStudents();
renderLectures();
renderHeatmap();
navigateTo("overview");
