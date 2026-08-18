import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";



/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyBJ2NFzLfXVlRbz8mL2bPNXyVMc4wZl_mk",

    authDomain:
        "fdsffsdf-a5398.firebaseapp.com",

    projectId:
        "fdsffsdf-a5398",

    storageBucket:
        "fdsffsdf-a5398.firebasestorage.app",

    messagingSenderId:
        "660514705234",

    appId:
        "1:660514705234:web:ebe445396a603a3c32f48b",

    measurementId:
        "G-DDW6LX4KFF"

};


const app =
    initializeApp(firebaseConfig);


const db =
    getFirestore(app);


const storage =
    getStorage(app);



/* =========================================================
   COLECCIÓN
========================================================= */

const COLLECTION_NAME =
    "usuarioPartesCoches";



/* =========================================================
   SESIÓN COMPARTIDA
========================================================= */

/*
  IMPORTANTE:

  Esta es la misma sesión que guarda
  tu index.html / app.js.

  Por tanto:

  index.html
       ↓
  iniciar sesión
       ↓
  localStorage
       ↓
  rankingPartes.html
       ↓
  sigue siendo administrador
*/

let currentAdmin = null;


function loadSharedSession() {

    try {

        const saved =
            localStorage.getItem(
                "rankingAdmin"
            );

        if (!saved) {

            currentAdmin = null;

            return;

        }

        const parsed =
            JSON.parse(saved);

        if (
            parsed &&
            parsed.usuario
        ) {

            currentAdmin =
                parsed;

        } else {

            currentAdmin =
                null;

        }

    } catch (error) {

        console.error(
            "Error leyendo sesión:",
            error
        );

        currentAdmin =
            null;

    }

}



function isAdmin() {

    return currentAdmin !== null;

}



/* =========================================================
   ELEMENTOS
========================================================= */

const rankingBody =
    document.getElementById(
        "carPartsRankingBody"
    );


const statusPill =
    document.getElementById(
        "statusPill"
    );


const sessionArea =
    document.getElementById(
        "sessionArea"
    );


const adminActions =
    document.getElementById(
        "adminActions"
    );


const addCarPartBtn =
    document.getElementById(
        "addCarPartBtn"
    );


const totalKg =
    document.getElementById(
        "totalKg"
    );


const addPartDialog =
    document.getElementById(
        "addPartDialog"
    );


const addPartForm =
    document.getElementById(
        "addPartForm"
    );


const closeAddPart =
    document.getElementById(
        "closeAddPart"
    );


const partName =
    document.getElementById(
        "partName"
    );


const partKg =
    document.getElementById(
        "partKg"
    );


const partPhoto =
    document.getElementById(
        "partPhoto"
    );


const addPartMessage =
    document.getElementById(
        "addPartMessage"
    );


const savePartBtn =
    document.getElementById(
        "savePartBtn"
    );


const addKgDialog =
    document.getElementById(
        "addKgDialog"
    );


const addKgForm =
    document.getElementById(
        "addKgForm"
    );


const closeAddKg =
    document.getElementById(
        "closeAddKg"
    );


const addKgTitle =
    document.getElementById(
        "addKgTitle"
    );


const additionalKg =
    document.getElementById(
        "additionalKg"
    );


const addKgMessage =
    document.getElementById(
        "addKgMessage"
    );


let selectedPerson = null;



/* =========================================================
   SESIÓN
========================================================= */

function updateSessionUI() {

    if (!currentAdmin) {

        statusPill.textContent =
            "Solo lectura";

        sessionArea.innerHTML =
            "";

        adminActions
            .classList
            .add("hidden");

        return;

    }


    statusPill.textContent =
        "Administrador";


    sessionArea.innerHTML = `

    <div class="session-chip">

      <span>
        ${escapeHtml(
        currentAdmin.nombre ||
        currentAdmin.usuario
    )}
      </span>

      <button
        id="logoutPartsBtn"
        type="button">

        Salir

      </button>

    </div>

  `;


    adminActions
        .classList
        .remove("hidden");


    document
        .getElementById(
            "logoutPartsBtn"
        )
        ?.addEventListener(
            "click",
            logout
        );

}



function logout() {

    localStorage.removeItem(
        "rankingAdmin"
    );

    currentAdmin =
        null;

    updateSessionUI();

    renderRanking(
        []
    );

}



/* =========================================================
   RANKING FIRESTORE
========================================================= */

function loadRanking() {

    const rankingRef =
        collection(
            db,
            COLLECTION_NAME
        );


    const rankingQuery =
        query(
            rankingRef,
            orderBy(
                "kg",
                "desc"
            )
        );


    onSnapshot(

        rankingQuery,

        snapshot => {

            const people =
                snapshot.docs.map(
                    document => ({

                        id:
                            document.id,

                        ...document.data()

                    })
                );


            renderRanking(
                people
            );

        },

        error => {

            console.error(
                "Error cargando ranking:",
                error
            );


            rankingBody.innerHTML = `

        <tr>

          <td
            colspan="3"
            class="empty">

            Error al cargar el ranking.

          </td>

        </tr>

      `;

        }

    );

}



/* =========================================================
   MOSTRAR RANKING
========================================================= */

function renderRanking(
    people
) {

    rankingBody.innerHTML =
        "";


    if (!people.length) {

        rankingBody.innerHTML = `

      <tr>

        <td
          colspan="3"
          class="empty">

          Todavía no hay personas.

        </td>

      </tr>

    `;

        totalKg.textContent =
            "0 kg";

        return;

    }


    let total =
        0;


    people.forEach(
        (person, index) => {

            const kg =
                Number(
                    person.kg || 0
                );


            total +=
                kg;


            const row =
                document.createElement(
                    "tr"
                );


            row.className =
                "person-row";


            /* POSICIÓN */

            const position =
                document.createElement(
                    "td"
                );

            position.className =
                "position-cell";

            position.textContent =
                `#${index + 1}`;


            /* NOMBRE + FOTO */

            const nameCell =
                document.createElement(
                    "td"
                );


            const personCell =
                document.createElement(
                    "div"
                );

            personCell.className =
                "person-cell";


            if (
                person.photoURL
            ) {

                const img =
                    document.createElement(
                        "img"
                    );

                img.className =
                    "avatar";

                img.src =
                    person.photoURL;

                img.alt =
                    person.name || "";

                personCell.appendChild(
                    img
                );

            } else {

                const fallback =
                    document.createElement(
                        "div"
                    );

                fallback.className =
                    "avatar-fallback";

                personCell.appendChild(
                    fallback
                );

            }


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "person-name";

            name.textContent =
                person.name ||
                "Sin nombre";


            personCell.appendChild(
                name
            );


            /*
              Si es administrador,
              mostramos + para añadir kg.
            */

            if (isAdmin()) {

                const addButton =
                    document.createElement(
                        "button"
                    );

                addButton.className =
                    "add-money-btn";

                addButton.type =
                    "button";

                addButton.textContent =
                    "+";

                addButton.title =
                    "Añadir kg";

                addButton.addEventListener(
                    "click",
                    () => {

                        openAddKg(
                            person
                        );

                    }
                );


                personCell.appendChild(
                    addButton
                );

            }


            nameCell.appendChild(
                personCell
            );


            /* KG */

            const kgCell =
                document.createElement(
                    "td"
                );

            kgCell.className =
                "kg-cell";

            kgCell.textContent =
                `${formatNumber(kg)} kg`;


            row.appendChild(
                position
            );

            row.appendChild(
                nameCell
            );

            row.appendChild(
                kgCell
            );


            rankingBody.appendChild(
                row
            );

        }
    );


    totalKg.textContent =
        `${formatNumber(total)} kg`;

}



/* =========================================================
   AÑADIR PERSONA
========================================================= */

addCarPartBtn.addEventListener(
    "click",
    () => {

        if (!isAdmin()) {

            return;

        }

        partName.value =
            "";

        partKg.value =
            "";

        partPhoto.value =
            "";

        addPartMessage.textContent =
            "";

        addPartDialog.showModal();

    }
);



closeAddPart.addEventListener(
    "click",
    () => {

        addPartDialog.close();

    }
);



addPartForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!isAdmin()) {

            return;

        }


        const name =
            partName.value.trim();


        const kg =
            Number(
                partKg.value
            );


        if (!name) {

            addPartMessage.textContent =
                "Introduce un nombre.";

            return;

        }


        if (
            !Number.isFinite(kg) ||
            kg < 0
        ) {

            addPartMessage.textContent =
                "Introduce una cantidad válida.";

            return;

        }


        savePartBtn.disabled =
            true;

        savePartBtn.textContent =
            "Guardando…";


        try {

            let photoURL =
                "";


            const file =
                partPhoto.files?.[0];


            /*
              FOTO
            */

            if (file) {

                if (
                    file.size >
                    5 * 1024 * 1024
                ) {

                    throw new Error(
                        "La foto no puede superar 5 MB."
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
                        `usuarioPartesCoches/${Date.now()}_${safeName}`
                    );


                await uploadBytes(
                    photoRef,
                    file
                );


                photoURL =
                    await getDownloadURL(
                        photoRef
                    );

            }


            /*
              FIRESTORE
            */

            await addDoc(

                collection(
                    db,
                    COLLECTION_NAME
                ),

                {

                    nombre:
                        name,

                    /*
                      Guardamos también name
                      para mantener el formato
                      fácil de leer desde la web.
                    */

                    name:
                        name,

                    kg:
                        kg,

                    photoURL:
                        photoURL,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }

            );


            addPartDialog.close();


        } catch (error) {

            console.error(
                "Error añadiendo persona:",
                error
            );


            addPartMessage.textContent =
                firebaseErrorMessage(
                    error
                );

        } finally {

            savePartBtn.disabled =
                false;

            savePartBtn.textContent =
                "Añadir al ranking";

        }

    }
);



/* =========================================================
   AÑADIR KG
========================================================= */

function openAddKg(
    person
) {

    if (!isAdmin()) {

        return;

    }


    selectedPerson =
        person;


    addKgTitle.textContent =
        `Añadir kg a ${person.name}`;


    additionalKg.value =
        "";


    addKgMessage.textContent =
        "";


    addKgDialog.showModal();

}



closeAddKg.addEventListener(
    "click",
    () => {

        addKgDialog.close();

        selectedPerson =
            null;

    }
);



addKgForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            !isAdmin() ||
            !selectedPerson
        ) {

            return;

        }


        const amount =
            Number(
                additionalKg.value
            );


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            addKgMessage.textContent =
                "Introduce una cantidad mayor que 0.";

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    COLLECTION_NAME,
                    selectedPerson.id
                ),

                {

                    kg:
                        increment(amount),

                    updatedAt:
                        serverTimestamp()

                }

            );


            addKgDialog.close();

            selectedPerson =
                null;


        } catch (error) {

            console.error(
                "Error añadiendo kg:",
                error
            );


            addKgMessage.textContent =
                firebaseErrorMessage(
                    error
                );

        }

    }
);



/* =========================================================
   BOTONES DE NAVEGACIÓN
========================================================= */

document
    .getElementById(
        "drugBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";

        }
    );


document
    .getElementById(
        "materialsRankingBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "materiales.html";

        }
    );



/* =========================================================
   UTILIDADES
========================================================= */

function formatNumber(
    number
) {

    return Number(
        number || 0
    ).toLocaleString(
        "es-ES",
        {
            maximumFractionDigits: 2
        }
    );

}



function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /[&<>"']/g,
            character => ({

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            }[character])
        );

}



function firebaseErrorMessage(
    error
) {

    const code =
        error?.code || "";


    if (
        code ===
        "permission-denied"
    ) {

        return "Firebase ha rechazado la operación por las reglas de Firestore.";

    }


    if (
        code ===
        "storage/unauthorized"
    ) {

        return "Firebase Storage no permite subir la foto. Revisa las reglas de Storage.";

    }


    return (
        error?.message ||
        "Ha ocurrido un error."
    );

}



/* =========================================================
   INICIO
========================================================= */

loadSharedSession();

updateSessionUI();

loadRanking();