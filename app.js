console.log("Ranking de Bolsas - app.js v11");

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyBJ2NFzLfXVlRbz8mL2bPNXyVMc4wZl_mk",
  authDomain: "fdsffsdf-a5398.firebaseapp.com",
  projectId: "fdsffsdf-a5398",
  storageBucket: "fdsffsdf-a5398.firebasestorage.app",
  messagingSenderId: "660514705234",
  appId: "1:660514705234:web:ebe445396a603a3c32f48b",
  measurementId: "G-DDW6LX4KFF"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);


const TABLES = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "6_8"
];


const ALL_COLLECTIONS = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "6_8",
  "6 Bolsas",
  "8 Bolsas"
];


let currentAdmin = null;

let currentMoneyPerson = null;
let currentMoneyTable = null;
let currentMoneyCollection = null;

let currentAddPersonTable = null;

let currentEditPerson = null;
let currentEditCollection = null;


/*
  TRUE = mostrar dinero junto al nombre.
  FALSE = ocultarlo.
*/
let showMoneyInRankings = false;


let unsubscribeRankings = [];

let lastRankingUpdate = null;

const $ = id =>
  document.getElementById(id);


const els = {

  loginHotspot:
    $("loginHotspot"),

  authDialog:
    $("authDialog"),

  authForm:
    $("authForm"),

  closeAuth:
    $("closeAuth"),

  authSubmit:
    $("authSubmit"),

  authMessage:
    $("authMessage"),

  username:
    $("username"),

  password:
    $("password"),

  sessionArea:
    $("sessionArea"),

  carlosResetBtn:
    $("carlosResetBtn"),

  statusPill:
    $("statusPill"),

  moneyButton:
    $("moneyOverviewBtn"),

  addPersonDialog:
    $("addPersonDialog"),

  addPersonForm:
    $("addPersonForm"),

  closeAddPerson:
    $("closeAddPerson"),

  personName:
    $("personName"),

  initialMoney:
    $("initialMoney"),

  personPhoto:
    $("personPhoto"),

  addPersonMessage:
    $("addPersonMessage"),

  moneyDialog:
    $("moneyDialog"),

  moneyForm:
    $("moneyForm"),

  closeMoney:
    $("closeMoney"),

  moneyTitle:
    $("moneyTitle"),

  moneyAmount:
    $("moneyAmount"),

  moneyMessage:
    $("moneyMessage"),

  editPersonBtn:
    $("editPersonBtn"),

  editPersonDialog:
    $("editPersonDialog"),

  closeEditPerson:
    $("closeEditPerson"),

  editPersonForm:
    $("editPersonForm"),

  editPersonName:
    $("editPersonName"),

  editPersonPhoto:
    $("editPersonPhoto"),

  editPersonMessage:
    $("editPersonMessage"),

  saveEditPersonBtn:
    $("saveEditPersonBtn"),

  moneyOverviewDialog:
    $("moneyOverviewDialog"),

  closeMoneyOverview:
    $("closeMoneyOverview"),

  moneyOverviewBody:
    $("moneyOverviewBody"),

  moneyOverviewTotal:
    $("moneyOverviewTotal"),

  moneyOverviewMessage:
    $("moneyOverviewMessage"),

  rowTemplate:
    $("rowTemplate")

};


const rankingBodies = [

  $("rankingBody0"),

  $("rankingBody1"),

  $("rankingBody2"),

  $("rankingBody68")

];


const rankingPeople = [

  [],

  [],

  [],

  []

];


function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );

}

/* =========================================================
   ÚLTIMA ACTUALIZACIÓN DEL RANKING
   ========================================================= */

function getTimestampMillis(timestamp) {

  if (!timestamp) {
    return null;
  }

  // Firebase Timestamp
  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  // Timestamp recibido como objeto
  if (typeof timestamp.seconds === "number") {
    return timestamp.seconds * 1000;
  }

  // Fecha JS
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  // Número
  if (typeof timestamp === "number") {
    return timestamp;
  }

  return null;
}


function updateLastRankingUpdate(people) {

  for (const person of people || []) {

    const updated =
      getTimestampMillis(person.updatedAt);

    const created =
      getTimestampMillis(person.createdAt);

    const timestamp =
      updated || created;

    if (!timestamp) {
      continue;
    }

    if (
      lastRankingUpdate === null ||
      timestamp > lastRankingUpdate
    ) {

      lastRankingUpdate =
        timestamp;

    }

  }

  renderLastRankingUpdate();
}


function formatElapsedTime(timestamp) {

  if (!timestamp) {
    return "Sin datos";
  }

  const now =
    Date.now();

  let difference =
    Math.max(
      0,
      now - timestamp
    );

  const seconds =
    Math.floor(
      difference / 1000
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const hours =
    Math.floor(
      minutes / 60
    );

  const days =
    Math.floor(
      hours / 24
    );


  if (seconds < 10) {
    return "Hace unos segundos";
  }

  if (seconds < 60) {
    return `Hace ${seconds} segundos`;
  }

  if (minutes < 60) {

    const remainingSeconds =
      seconds % 60;

    if (remainingSeconds === 0) {
      return `Hace ${minutes} min`;
    }

    return `Hace ${minutes} min ${remainingSeconds} s`;
  }


  if (hours < 24) {

    const remainingMinutes =
      minutes % 60;

    if (remainingMinutes === 0) {
      return `Hace ${hours} h`;
    }

    return `Hace ${hours} h ${remainingMinutes} min`;
  }


  if (days < 7) {

    const remainingHours =
      hours % 24;

    if (remainingHours === 0) {
      return `Hace ${days} días`;
    }

    return `Hace ${days} días ${remainingHours} h`;
  }


  return `Hace ${days} días`;
}


function renderLastRankingUpdate() {

  const text =
    document.getElementById(
      "rankingUpdateText"
    );

  const time =
    document.getElementById(
      "rankingUpdateTime"
    );


  if (!text || !time) {
    return;
  }


  if (!lastRankingUpdate) {

    text.textContent =
      "Sin actualizaciones";

    time.textContent =
      "--";

    return;
  }


  text.textContent =
    formatElapsedTime(
      lastRankingUpdate
    );


  const date =
    new Date(
      lastRankingUpdate
    );


  time.textContent =
    `Actualizado a las ${date.toLocaleTimeString(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    )
    }`;
}

setInterval(
  renderLastRankingUpdate,
  1000
);


function showError(
  element,
  message
) {

  if (element) {

    element.textContent =
      message || "";

  }

}


function firebaseErrorMessage(
  error
) {

  const code =
    error?.code || "";

  const messages = {

    "permission-denied":
      "Firebase ha rechazado la operación por las reglas de Firestore.",

    "storage/unauthorized":
      "Firebase Storage ha rechazado la imagen. Revisa las reglas de Storage.",

    "storage/unauthenticated":
      "Firebase Storage no permite la subida porque el usuario no está autenticado.",

    "storage/quota-exceeded":
      "Se ha superado la cuota de almacenamiento.",

    "not-found":
      "No se encontró el documento.",

    "failed-precondition":
      "Firebase necesita una configuración adicional."

  };

  return (
    messages[code] ||
    error?.message ||
    "Ha ocurrido un error."
  );

}


function formatMoney(value) {

  const number = Number(value || 0);

  const absolute = Math.abs(number);

  let result;

  if (absolute >= 1_000_000_000) {

    result =
      (number / 1_000_000_000)
        .toFixed(1)
        .replace(/\.0$/, "");

    return `${result}B`;

  }

  if (absolute >= 1_000_000) {

    result =
      (number / 1_000_000)
        .toFixed(1)
        .replace(/\.0$/, "");

    return `${result}M`;

  }

  if (absolute >= 1_000) {

    result =
      (number / 1_000)
        .toFixed(1)
        .replace(/\.0$/, "");

    return `${result}K`;

  }

  return `${Math.round(number)}$`;

}


function sortByMoney(
  a,
  b
) {

  return (
    Number(b?.money || 0) -
    Number(a?.money || 0)
  );

}


function displayGroupName(
  name
) {

  return [
    "6_8",
    "6 Bolsas",
    "8 Bolsas"
  ].includes(name)
    ? "6 / 8"
    : name;

}


function isAdmin() {

  return currentAdmin !== null;

}


function canResetMoney() {

  if (!currentAdmin) {
    return false;
  }

  const name =
    String(
      currentAdmin.nombre || ""
    )
      .trim()
      .toLowerCase();

  return (
    name === "carlos" ||
    currentAdmin.canReset === true
  );

}


function saveSession() {

  if (!currentAdmin) {

    localStorage.removeItem(
      "rankingAdmin"
    );

    return;

  }

  localStorage.setItem(
    "rankingAdmin",
    JSON.stringify(
      currentAdmin
    )
  );

}


function loadSession() {

  try {

    const saved =
      localStorage.getItem(
        "rankingAdmin"
      );

    if (saved) {

      const admin =
        JSON.parse(saved);

      if (admin?.usuario) {

        currentAdmin =
          admin;

      }

    }

  } catch (error) {

    console.error(
      "Error cargando sesión:",
      error
    );

    currentAdmin =
      null;

  }

}


function updateMoneyButton() {

  if (!els.moneyButton) {
    return;
  }

  els.moneyButton.textContent =
    showMoneyInRankings
      ? "Ocultar dinero"
      : "Dinero";

  els.moneyButton.classList.toggle(
    "hidden",
    !isAdmin()
  );

}


function updateSessionUI() {

  if (!els.sessionArea) {
    return;
  }


  if (!currentAdmin) {

    els.sessionArea.innerHTML =
      "";

    els.carlosResetBtn?.classList.add(
      "hidden"
    );

    showMoneyInRankings =
      false;

    updateMoneyButton();

    if (els.statusPill) {

      els.statusPill.textContent =
        "Solo lectura";

    }

    renderAllRankings();

    return;

  }


  const name =
    currentAdmin.nombre ||
    currentAdmin.usuario;


  els.sessionArea.innerHTML = `

    <div class="session-chip">

      <span>
        ${escapeHtml(name)}
      </span>

      <button
        id="logoutBtn"
        type="button">

        Salir

      </button>

    </div>

  `;


  $("logoutBtn")?.addEventListener(
    "click",
    logout
  );


  els.carlosResetBtn?.classList.toggle(
    "hidden",
    !canResetMoney()
  );


  if (els.statusPill) {

    els.statusPill.textContent =
      "Administrador";

  }


  updateMoneyButton();

  renderAllRankings();

}


function logout() {

  currentAdmin =
    null;

  localStorage.removeItem(
    "rankingAdmin"
  );

  updateSessionUI();

}


async function loginAdmin(
  username,
  password
) {

  const cleanUsername =
    username
      .trim()
      .toLowerCase();


  const q =
    query(

      collection(
        db,
        "admin"
      ),

      where(
        "usuario",
        "==",
        cleanUsername
      ),

      where(
        "contraseña",
        "==",
        password
      )

    );


  const snapshot =
    await getDocs(q);


  if (snapshot.empty) {
    return null;
  }


  const adminDoc =
    snapshot.docs[0];

  const data =
    adminDoc.data();


  if (
    data.activo === false
  ) {

    return null;

  }


  return {

    id:
      adminDoc.id,

    usuario:
      data.usuario ||
      cleanUsername,

    nombre:
      data.nombre ||
      data.usuario ||
      cleanUsername,

    canReset:
      data.canReset === true

  };

}


async function uploadPersonPhoto(
  collectionName,
  personId,
  file
) {

  if (!file) {
    return "";
  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      "La foto no puede superar 5 MB."
    );

  }


  if (
    !file.type?.startsWith(
      "image/"
    )
  ) {

    throw new Error(
      "El archivo seleccionado no es una imagen."
    );

  }


  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );


  const photoRef =
    ref(
      storage,
      `people/${collectionName}/${personId}/${Date.now()}_${safeName}`
    );


  await uploadBytes(
    photoRef,
    file
  );


  return await getDownloadURL(
    photoRef
  );

}


function photoUrlWithCache(
  url,
  person
) {

  if (!url) {
    return "";
  }


  const separator =
    url.includes("?")
      ? "&"
      : "?";


  const version =
    person.updatedAt?.seconds ||
    Date.now();


  return (
    `${url}${separator}v=${version}`
  );

}


function renderRanking(
  tableIndex
) {

  const body =
    rankingBodies[
    tableIndex
    ];


  if (!body) {
    return;
  }


  const people =
    rankingPeople[
    tableIndex
    ] || [];


  body.innerHTML =
    "";


  if (!people.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="2"
          class="empty">

          Todavía no hay personas.

        </td>

      </tr>

    `;

  } else {

    people.forEach(
      (
        person,
        index
      ) => {

        const fragment =
          document.importNode(
            els.rowTemplate.content,
            true
          );


        const position =
          fragment.querySelector(
            ".position-cell"
          );


        const name =
          fragment.querySelector(
            ".person-name"
          );


        const image =
          fragment.querySelector(
            ".avatar"
          );


        const fallback =
          fragment.querySelector(
            ".avatar-fallback"
          );


        const addButton =
          fragment.querySelector(
            ".add-money-btn"
          );


        if (position) {

          position.textContent =
            `#${index + 1}`;

        }


        if (name) {

          name.textContent =
            person.name ||
            "Sin nombre";


          /*
            Aquí está el cambio importante:
            el dinero aparece al lado del nombre
            solamente cuando el botón "Dinero"
            está activado.
          */

          if (
            showMoneyInRankings
          ) {

            const money =
              document.createElement(
                "span"
              );


            money.className =
              "person-money";


            money.textContent =
              ` ${formatMoney(
                person.money
              )}`;


            name.appendChild(
              money
            );

          }

        }


        if (
          image &&
          fallback
        ) {

          if (
            person.photoURL
          ) {

            image.src =
              photoUrlWithCache(
                person.photoURL,
                person
              );


            image.alt =
              person.name ||
              "Foto";


            image.hidden =
              false;


            fallback.hidden =
              true;

          } else {

            image.hidden =
              true;


            fallback.hidden =
              false;

          }

        }


        if (addButton) {

          addButton.classList.toggle(
            "hidden",
            !isAdmin()
          );


          addButton.onclick =
            event => {

              event.preventDefault();

              event.stopPropagation();

              openMoneyDialog(
                person,
                tableIndex
              );

            };

        }


        body.appendChild(
          fragment
        );

      }
    );

  }


  if (isAdmin()) {

    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td colspan="2">

        <button
          class="primary-btn"
          type="button">

          + Añadir persona

        </button>

      </td>

    `;


    row
      .querySelector(
        "button"
      )
      ?.addEventListener(
        "click",
        () => {

          openAddPersonDialog(
            tableIndex
          );

        }
      );


    body.appendChild(
      row
    );

  }

}


function renderAllRankings() {

  renderRanking(0);

  renderRanking(1);

  renderRanking(2);

  renderRanking(3);

}


function subscribeAllRankings() {

  unsubscribeRankings.forEach(
    unsubscribe => {

      try {

        unsubscribe();

      } catch (_) { }

    }
  );


  unsubscribeRankings =
    [];


  subscribeNormalRanking(
    "20 Bolsas",
    0
  );


  subscribeNormalRanking(
    "16 Bolsas",
    1
  );


  subscribeNormalRanking(
    "12 Bolsas",
    2
  );


  subscribe68Ranking();

}


function subscribeNormalRanking(
  tableName,
  tableIndex
) {

  const body =
    rankingBodies[
    tableIndex
    ];


  if (!body) {
    return;
  }


  body.innerHTML = `

    <tr>

      <td
        colspan="2"
        class="empty">

        Cargando…

      </td>

    </tr>

  `;


  const peopleRef =
    collection(
      db,
      "tables",
      tableName,
      "people"
    );


  const unsubscribe =
    onSnapshot(

      peopleRef,

      snapshot => {

        rankingPeople[
          tableIndex
        ] =
          snapshot.docs
            .map(
              personDoc => ({

                id:
                  personDoc.id,

                tableName,

                ...personDoc.data()

              })
            )
            .sort(
              sortByMoney
            );

        updateLastRankingUpdate(
          rankingPeople[tableIndex]
        );


        renderRanking(
          tableIndex
        );

      },

      error => {

        console.error(
          `Error en ${tableName}:`,
          error
        );


        body.innerHTML = `

          <tr>

            <td
              colspan="2"
              class="empty">

              No se pudo cargar.

            </td>

          </tr>

        `;

      }

    );


  unsubscribeRankings.push(
    unsubscribe
  );

}


function subscribe68Ranking() {

  const body =
    $("rankingBody68");


  if (!body) {
    return;
  }


  const sources = [

    "6_8",

    "6 Bolsas",

    "8 Bolsas"

  ];


  const sourceData = {

    "6_8": [],

    "6 Bolsas": [],

    "8 Bolsas": []

  };


  sources.forEach(
    sourceName => {

      const peopleRef =
        collection(
          db,
          "tables",
          sourceName,
          "people"
        );


      const unsubscribe =
        onSnapshot(

          peopleRef,

          snapshot => {

            sourceData[
              sourceName
            ] =
              snapshot.docs.map(
                d => ({

                  id:
                    d.id,

                  tableName:
                    sourceName,

                  ...d.data()

                })
              );


            rankingPeople[3] = [

              ...sourceData["6_8"],

              ...sourceData["6 Bolsas"],

              ...sourceData["8 Bolsas"]

            ].sort(
              sortByMoney
            );

            updateLastRankingUpdate(
              rankingPeople[3]
            );
            renderRanking(3);

          },

          error => {

            console.error(
              `Error en grupo 6 / 8 (${sourceName}):`,
              error
            );

          }

        );


      unsubscribeRankings.push(
        unsubscribe
      );

    }
  );

}


function openAddPersonDialog(
  tableIndex
) {

  if (!isAdmin()) {
    return;
  }


  currentAddPersonTable =
    tableIndex;


  showError(
    els.addPersonMessage,
    ""
  );


  if (els.personName) {

    els.personName.value =
      "";

  }


  if (els.initialMoney) {

    els.initialMoney.value =
      "0";

  }


  if (els.personPhoto) {

    els.personPhoto.value =
      "";

  }


  els.addPersonDialog?.showModal();

}


function openMoneyDialog(
  person,
  tableIndex
) {

  if (!isAdmin()) {
    return;
  }


  currentMoneyPerson =
    person;


  currentMoneyTable =
    tableIndex;


  currentMoneyCollection =
    person.tableName ||
    (
      tableIndex === 3
        ? "6_8"
        : TABLES[
        tableIndex
        ]
    );


  if (els.moneyTitle) {

    els.moneyTitle.textContent =
      `Añadir dinero a ${person.name ||
      "esta persona"
      }`;

  }


  if (els.moneyAmount) {

    els.moneyAmount.value =
      "";

  }


  showError(
    els.moneyMessage,
    ""
  );


  /*
    IMPORTANTE:
    NO creamos otro botón aquí.

    El botón "Editar persona"
    ya existe en el HTML.
  */

  els.editPersonBtn?.classList.remove(
    "hidden"
  );


  els.moneyDialog?.showModal();

}


function openEditPersonDialog() {

  if (
    !isAdmin() ||
    !currentMoneyPerson
  ) {

    return;
  }


  currentEditPerson =
    currentMoneyPerson;


  currentEditCollection =
    currentMoneyCollection;


  if (els.editPersonName) {

    els.editPersonName.value =
      currentEditPerson.name ||
      "";

  }


  if (els.editPersonPhoto) {

    els.editPersonPhoto.value =
      "";

  }


  showError(
    els.editPersonMessage,
    ""
  );


  if (
    els.moneyDialog?.open
  ) {

    els.moneyDialog.close();

  }


  els.editPersonDialog?.showModal();

}


async function saveEditedPerson(
  event
) {

  event.preventDefault();


  if (
    !isAdmin() ||
    !currentEditPerson ||
    !currentEditCollection
  ) {

    return;

  }


  const name =
    els.editPersonName
      ?.value
      .trim() ||
    "";


  const file =
    els.editPersonPhoto
      ?.files?.[0];


  if (!name) {

    showError(
      els.editPersonMessage,
      "Escribe un nombre."
    );

    return;

  }


  if (els.saveEditPersonBtn) {

    els.saveEditPersonBtn.disabled =
      true;

    els.saveEditPersonBtn.textContent =
      "Guardando…";

  }


  try {

    let photoURL =
      currentEditPerson.photoURL ||
      "";


    /*
      Si se selecciona una nueva foto,
      se sube una nueva imagen.
    */

    if (file) {

      photoURL =
        await uploadPersonPhoto(
          currentEditCollection,
          currentEditPerson.id,
          file
        );

    }


    const newUpdatedAt = {

      seconds:
        Math.floor(
          Date.now() / 1000
        )

    };


    await updateDoc(

      doc(
        db,
        "tables",
        currentEditCollection,
        "people",
        currentEditPerson.id
      ),

      {

        name,

        photoURL,

        updatedAt:
          serverTimestamp()

      }

    );


    /*
      Actualización inmediata.
      No esperamos al onSnapshot.
    */

    currentEditPerson.name =
      name;


    currentEditPerson.photoURL =
      photoURL;


    currentEditPerson.updatedAt =
      newUpdatedAt;


    rankingPeople.forEach(
      people => {

        const found =
          people.find(
            person =>
              person.id ===
              currentEditPerson.id &&
              person.tableName ===
              currentEditPerson.tableName
          );


        if (found) {

          found.name =
            name;

          found.photoURL =
            photoURL;

          found.updatedAt =
            newUpdatedAt;

        }

      }
    );


    /*
      Repinta inmediatamente el ranking.
    */

    renderAllRankings();


    /*
      Cerramos edición.
    */

    els.editPersonDialog?.close();


    /*
      Volvemos a la ventana de dinero
      con el nombre actualizado.
    */

    if (currentMoneyPerson) {

      currentMoneyPerson =
        currentEditPerson;


      if (els.moneyTitle) {

        els.moneyTitle.textContent =
          `Añadir dinero a ${currentEditPerson.name
          }`;

      }


      els.moneyDialog?.showModal();

    }


    showError(
      els.editPersonMessage,
      ""
    );


  } catch (error) {

    console.error(
      "Error editando persona:",
      error
    );


    showError(
      els.editPersonMessage,
      firebaseErrorMessage(error)
    );


  } finally {

    if (els.saveEditPersonBtn) {

      els.saveEditPersonBtn.disabled =
        false;

      els.saveEditPersonBtn.textContent =
        "Guardar cambios";

    }

  }

}


if (els.addPersonForm) {

  els.addPersonForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      showError(
        els.addPersonMessage,
        ""
      );


      if (!isAdmin()) {

        showError(
          els.addPersonMessage,
          "No tienes permisos de administrador."
        );

        return;

      }


      if (
        currentAddPersonTable ===
        null
      ) {

        showError(
          els.addPersonMessage,
          "No se ha seleccionado un ranking."
        );

        return;

      }


      const name =
        els.personName
          ?.value
          .trim() ||
        "";


      const money =
        Number(
          els.initialMoney?.value
        );


      const file =
        els.personPhoto
          ?.files?.[0];


      if (!name) {

        showError(
          els.addPersonMessage,
          "Escribe un nombre."
        );

        return;

      }


      if (
        !Number.isFinite(money) ||
        money < 0
      ) {

        showError(
          els.addPersonMessage,
          "El dinero no puede ser negativo."
        );

        return;

      }


      try {

        const collectionName =
          currentAddPersonTable === 3
            ? "6_8"
            : TABLES[
            currentAddPersonTable
            ];


        const peopleRef =
          collection(
            db,
            "tables",
            collectionName,
            "people"
          );


        const newPersonRef =
          doc(peopleRef);


        let photoURL =
          "";


        if (file) {

          photoURL =
            await uploadPersonPhoto(
              collectionName,
              newPersonRef.id,
              file
            );

        }


        await setDoc(
          newPersonRef,
          {

            name,

            money,

            photoURL,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }
        );


        els.addPersonDialog?.close();


        currentAddPersonTable =
          null;


      } catch (error) {

        console.error(
          "Error añadiendo persona:",
          error
        );


        showError(
          els.addPersonMessage,
          firebaseErrorMessage(error)
        );

      }

    }
  );

}


if (els.moneyForm) {

  els.moneyForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      showError(
        els.moneyMessage,
        ""
      );


      if (
        !isAdmin() ||
        !currentMoneyPerson ||
        currentMoneyTable ===
        null
      ) {

        showError(
          els.moneyMessage,
          "No tienes permisos de administrador."
        );

        return;

      }


      const amount =
        Number(
          els.moneyAmount?.value
        );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        showError(
          els.moneyMessage,
          "Introduce una cantidad mayor que 0."
        );

        return;

      }


      try {

        await updateDoc(

          doc(
            db,
            "tables",
            currentMoneyCollection,
            "people",
            currentMoneyPerson.id
          ),

          {

            money:
              increment(amount),

            updatedAt:
              serverTimestamp()

          }

        );


        /*
          Actualización inmediata.
        */

        currentMoneyPerson.money =
          Number(
            currentMoneyPerson.money ||
            0
          ) + amount;


        rankingPeople.forEach(
          people => {

            const found =
              people.find(
                person =>
                  person.id ===
                  currentMoneyPerson.id &&
                  person.tableName ===
                  currentMoneyPerson.tableName
              );


            if (found) {

              found.money =
                Number(
                  found.money || 0
                ) + amount;

            }

          }
        );


        renderAllRankings();


        els.moneyDialog?.close();


        currentMoneyPerson =
          null;

        currentMoneyTable =
          null;

        currentMoneyCollection =
          null;


      } catch (error) {

        console.error(
          "Error añadiendo dinero:",
          error
        );


        showError(
          els.moneyMessage,
          firebaseErrorMessage(error)
        );

      }

    }
  );

}


/*
  EDITAR PERSONA

  Este listener se registra UNA sola vez.
*/

if (els.editPersonForm) {

  els.editPersonForm.addEventListener(
    "submit",
    saveEditedPerson
  );

}


els.editPersonBtn?.addEventListener(
  "click",
  openEditPersonDialog
);


els.closeEditPerson?.addEventListener(
  "click",
  () => {

    els.editPersonDialog?.close();

  }
);


els.closeMoney?.addEventListener(
  "click",
  () => {

    els.moneyDialog?.close();

    currentMoneyPerson =
      null;

    currentMoneyTable =
      null;

    currentMoneyCollection =
      null;

  }
);


els.closeAddPerson?.addEventListener(
  "click",
  () => {

    els.addPersonDialog?.close();

    currentAddPersonTable =
      null;

  }
);


els.closeAuth?.addEventListener(
  "click",
  () => {

    els.authDialog?.close();

  }
);


els.loginHotspot?.addEventListener(
  "click",
  () => {

    if (isAdmin()) {
      return;
    }


    showError(
      els.authMessage,
      ""
    );


    if (els.username) {

      els.username.value =
        "";

    }


    if (els.password) {

      els.password.value =
        "";

    }


    els.authDialog?.showModal();

  }
);


els.authForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    showError(
      els.authMessage,
      ""
    );


    const username =
      els.username
        ?.value
        .trim() ||
      "";


    const password =
      els.password?.value ||
      "";


    if (!username) {

      showError(
        els.authMessage,
        "Introduce el usuario."
      );

      return;

    }


    if (!password) {

      showError(
        els.authMessage,
        "Introduce la contraseña."
      );

      return;

    }


    els.authSubmit.disabled =
      true;


    els.authSubmit.textContent =
      "Comprobando…";


    try {

      const admin =
        await loginAdmin(
          username,
          password
        );


      if (!admin) {

        throw new Error(
          "Usuario o contraseña incorrectos, o la cuenta no está autorizada."
        );

      }


      currentAdmin =
        admin;


      saveSession();


      updateSessionUI();


      els.authDialog?.close();


      els.authForm.reset();


    } catch (error) {

      console.error(
        error
      );


      showError(
        els.authMessage,
        error.message ||
        "No se pudo iniciar sesión."
      );


    } finally {

      els.authSubmit.disabled =
        false;


      els.authSubmit.textContent =
        "Entrar";

    }

  }
);


/*
  BOTÓN DINERO

  Primera pulsación:
    prueba 10.000$

  Segunda pulsación:
    prueba

  Tercera:
    prueba 10.000$

  etc.
*/

els.moneyButton?.addEventListener(
  "click",
  () => {

    if (!isAdmin()) {
      return;
    }


    showMoneyInRankings =
      !showMoneyInRankings;


    updateMoneyButton();


    renderAllRankings();

  }
);


/*
  RESET DINERO
*/

els.carlosResetBtn?.addEventListener(
  "click",
  async () => {

    if (
      !isAdmin() ||
      !canResetMoney()
    ) {

      return;

    }


    const ok =
      confirm(
        "Esto pondrá el dinero de TODAS las personas de TODOS los grupos a 0. Los nombres y fotos se conservarán. ¿Continuar?"
      );


    if (!ok) {
      return;
    }


    try {

      for (
        const collectionName
        of ALL_COLLECTIONS
      ) {

        const peopleRef =
          collection(
            db,
            "tables",
            collectionName,
            "people"
          );


        const snapshot =
          await getDocs(
            peopleRef
          );


        if (
          snapshot.empty
        ) {

          continue;

        }


        const batch =
          writeBatch(db);


        snapshot.forEach(
          personDoc => {

            batch.update(
              personDoc.ref,
              {

                money:
                  0,

                updatedAt:
                  serverTimestamp()

              }
            );

          }
        );


        await batch.commit();

      }


      rankingPeople.forEach(
        people => {

          people.forEach(
            person => {

              person.money =
                0;

            }
          );

        }
      );


      renderAllRankings();


      alert(
        "Dinero reseteado correctamente."
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        firebaseErrorMessage(error)
      );

    }

  }
);


/*
  Cerrar ventana de dinero de todos,
  por si se utiliza en el futuro.
*/

els.closeMoneyOverview?.addEventListener(
  "click",
  () => {

    els.moneyOverviewDialog?.close();

  }
);


/*
  INICIO
*/

loadSession();

updateSessionUI();

subscribeAllRankings();

const materialsRankingBtn = document.getElementById("materialsRankingBtn");
const carPartsRankingBtn = document.getElementById("carPartsRankingBtn");

materialsRankingBtn?.addEventListener("click", () => {
  window.location.href = "materiales.html";
});

carPartsRankingBtn?.addEventListener("click", () => {
  window.location.href = "partes.html";
});