const dateInput = document.querySelector("#dateInput"),
  noContentDiv = document.querySelector("#no-content"),
  contentDiv = document.querySelector("#content"),
  text1 = document.querySelector("#text1"),
  label1 = document.querySelector("#label1"),
  checkbox1 = document.querySelector("#checkbox1"),
  text2 = document.querySelector("#text2"),
  label2 = document.querySelector("#label2"),
  checkbox2 = document.querySelector("#checkbox2"),
  help = document.querySelector("#help"),
  helpCloseButton = document.querySelector("#helpCloseButton"),
  userProgress = document.querySelector("#userProgress"),
  yearProgress = document.querySelector("#yearProgress"),
  badge = document.querySelector("#badge");

let lastYearFetched = null,
  readings = {},
  today = formatDateToString(),
  todayTexts = readings[dateInput.value],
  userHistory = localStorage.getItem("history") ? JSON.parse(localStorage.getItem("history")) : {},
  userProgressCount = 0,
  yearProgressCount = 0;

dateInput.value = today;

dateInput.addEventListener("input", e => {
  updateContent();
  umami(`O usuário alterou para o dia ${e.target.value.split("-").reverse().join("/")}`);
});
checkbox1.addEventListener("change", checkConclusion);
checkbox2.addEventListener("change", checkConclusion);

function getTexts() {
  if (!dateInput.value) return;

  let year = dateInput.value.split("-")[0];

  if (year !== lastYearFetched) {
    axios.get(`./js/${year}.json`)
      .then(res => {
        readings = res.data;
      })
      .catch(() => hideContent())
      .then(() => {
        lastYearFetched = year;
        updateContent();
        getTotalReadingsOfTheYearUntilToday();
        getCompletedUserReadings();
        checkUserOnStreak();
      });
  }
}

function checkConclusion(e) {
  let checked = e.target.checked,
    label = e.target.id === "checkbox1" ? label1 : label2,
    number = e.target.id === "checkbox1" ? 1 : 2,
    now = new Date(),
    localSave = userHistory;

  if (!localSave[dateInput.value]) {
    localSave[dateInput.value] = { "1": null, "2": null };
  }

  if (checked) {
    label.innerHTML = "Concluída em<br />" + now.toLocaleString("pt-BR");

    localSave[dateInput.value][number] = now;

    umami(`A leitura ${number} do dia ${dateInput.value.split("-").reverse().join("/")} foi concluída`);
  } else {
    if (!confirm("Deseja realmente tornar esta leitura como pendente?")) {
      e.target.checked = true;
      return;
    };

    label.innerHTML = "Pendente";
    localSave[dateInput.value][number] = null;

    checkNullDateHistory();

    umami(`A conclusão da leitura ${number} do dia ${dateInput.value.split("-").reverse().join("/")} foi removida`);
  }

  localStorage.setItem("history", JSON.stringify(localSave));
  getCompletedUserReadings();
  checkUserOnStreak();
}

function checkHistory() {
  if (userHistory[dateInput.value]) {
    if (userHistory[dateInput.value][1] !== null) {
      completeText1();
    } else {
      uncompleteText1();
    }

    if (userHistory[dateInput.value][2] !== null) {
      completeText2();
    } else {
      uncompleteText2();
    }
  } else {
    uncompleteText1();
    uncompleteText2();
  }

  checkNullDateHistory();
}

function checkNullDateHistory() {
  if (
    userHistory[dateInput.value]
    && userHistory[dateInput.value][1] === null
    && userHistory[dateInput.value][2] === null
  ) {
    delete userHistory[dateInput.value];

    localStorage.setItem('history', JSON.stringify(userHistory));
  }
}

function completeText1() {
  label1.innerHTML = "Concluída em<br />" + (new Date(userHistory[dateInput.value][1])).toLocaleString("pt-BR");
  checkbox1.checked = true;
}

function uncompleteText1() {
  label1.innerHTML = "Pendente";
  checkbox1.checked = false;
}

function completeText2() {
  label2.innerHTML = "Concluída em<br />" + (new Date(userHistory[dateInput.value][2])).toLocaleString("pt-BR");
  checkbox2.checked = true;
}

function uncompleteText2() {
  label2.innerHTML = "Pendente";
  checkbox2.checked = false;
}

function hideContent() {
  contentDiv.style.display = "none";
  noContentDiv.style.display = "block";
}

function showContent() {
  contentDiv.style.display = "flex";
  noContentDiv.style.display = "none";
}

function updateTodayTexts() {
  todayTexts = readings[dateInput.value];

  if (todayTexts === undefined || todayTexts === null) {
    hideContent();
    text1.innerText = "1";
    text2.innerText = "2";
  } else {
    showContent();
    text1.innerText = todayTexts[1];
    text2.innerText = todayTexts[2];
  }
}

function updateContent() {
  getTexts();
  updateTodayTexts();
  checkHistory();
}

function exportHistory(e) {
  if (localStorage.getItem("history") === null) return;

  let content = new Blob([localStorage.getItem("history")], { type: "text/plain" });

  let exportDate = new Date();

  e.target.href = URL.createObjectURL(content);
  e.target.download = "BackupLeituraBiblica-v" + exportDate.getTime();

  umami("O usuário fez backup dos dados");
}

function importHistory(e) {
  var file = e.target.files[0];

  if (file.type === "text/plain") {
    var reader = new FileReader();

    reader.readAsText(file);

    reader.onload = (ev) => {
      let text = ev.target.result;
      let json = JSON.parse(text);

      if (
        Object.keys(json).length > 0
        && new Date(Object.keys(json)[0]) instanceof Date
      ) {
        localStorage.setItem("history", text);
        userHistory = json;
        showImportMessage();
        updateContent();

        umami("O usuário restaurou os dados de um backup");
      }
    };
  }
}

function changeDate(period) {
  let selectedDate = new Date(dateInput.value + "T00:00");

  selectedDate.setDate(selectedDate.getDate() + period);

  if (selectedDate < new Date("2021-01-01T00:00")) return;

  dateInput.value = formatDateToString(selectedDate);

  updateContent();

  umami(`O usuário alterou para o dia ${dateInput.value.split("-").reverse().join("/")}`);
}

function showHelp() {
  help.style.left = 0;
  helpCloseButton.style.display = "block";

  umami("O usuário abriu a ajuda");
}

function closeHelp() {
  help.style.left = "-100%";
  helpCloseButton.style.display = "none";

  umami("O usuário fechou a ajuda");
}

function formatDateToString(date = new Date()) {
  return date.toLocaleDateString().split("/").reverse().join("-");
}

function showImportMessage() {
  let qty = Object.keys(userHistory).length;
  let message = qty === 1 ? "Foi importado 1 dia" : `Foram importados ${qty} dias`;

  alert(`${message} do seu arquivo de backup!`);
}

function getTotalReadingsOfTheYearUntilToday() {
  yearProgressCount = Object.keys(readings).filter(
    //Filtrar datas do objeto
    date => readings[date] !== null
      && date >= `${lastYearFetched}-01-01` //maiores ou igual ao primeiro dia do ano atual
      && date <= `${lastYearFetched}-12-31` //menores ou igual ao último dia do ano atual
      && date <= formatDateToString(new Date()) //menores ou igual ao dia atual
  ).length;

  let s = yearProgressCount !== 1 ? "s" : "";

  yearProgress.innerHTML = `<b>${yearProgressCount}</b> dia${s} concluído${s}`;
}

function getCompletedUserReadings() {
  userProgressCount = Object.keys(userHistory).filter(
    date => userHistory[date][1] !== null && userHistory[date][2]
  ).length;

  userProgress.innerText = userProgressCount;
}

function checkUserOnStreak() {
  if (yearProgressCount > 0 && userProgressCount >= yearProgressCount) {
    badge.style.display = "block";
    umami("O usuário está em dia com as leituras");
  } else {
    badge.style.display = "none";
  }
}

//Atualizar o conteúdo com o dia atual
updateContent();