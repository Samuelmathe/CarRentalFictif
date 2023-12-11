document.getElementById('openDefault').click();

function openTab(evt, tabName) {
  let i, tabcontent, tablinks;

  // Masquer tous les contenus des onglets
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Désactiver tous les liens des onglets
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Afficher le contenu de l'onglet sélectionné et activer le lien
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

const voitures = [
  {
    image: 'https://www.hdcarwallpapers.com/walls/2015_ferrari_488_gtb-wide.jpg',
    nom: 'ferrari 488 gtb',
    marque: 'ferrari',
    prix: 100,
    carburant: 'Essence',
    personnes: 2
  },
  {
    image: 'https://evbite.com/wp-content/uploads/2018/11/Second-Gen-Nissan-LEAF.jpg',
    nom: 'Nissan Leaf',
    marque: 'nissan',
    prix: 120,
    carburant: 'Électrique',
    personnes: 4
  },
  {
    image: 'https://cdn.motor1.com/images/mgl/2XV1p/s1/ferrari-sf90-stradale-la-prova.jpg',
    nom: 'ferrari sf90 stradale',
    marque: 'ferrari',
    prix: 135,
    carburant: 'Électrique',
    personnes: 2
  },
  {
    image: 'https://www.mantapro.com.au/wp-content/uploads/2015/05/3.0L-Hilux1.png',
    nom: 'Toyota Hilux D4D',
    marque: 'toyota',
    prix: 50,
    carburant: 'Diesel',
    personnes: 2
  },
  {
    image: 'https://th.bing.com/th/id/R.b9641baf3216ac6c25f80488c669cde1?rik=%2fRh%2f7rXkYSbfAA&pid=ImgRaw&r=0',
    nom: 'Nissan Titan V8',
    marque: 'nissan',
    prix: 150,
    carburant: 'Diesel',
    personnes: 4
  },
  {
    image: 'https://www.autocar.co.uk/sites/autocar.co.uk/files/images/car-reviews/first-drives/legacy/ka.jpg',
    nom: 'ford ka+',
    marque: 'ford',
    prix: 80,
    carburant: 'Essence',
    personnes: 4
  },
  {
    image: 'https://autocity.com/wp-content/uploads/images/6/2/59562_honda-fr-v-2.jpg',
    nom: 'honda fr-v',
    marque: 'honda',
    prix: 80,
    carburant: 'Essence',
    personnes: 4
  },
  {
    image: 'https://s1.cdn.autoevolution.com/images/news/bmw-i5-suv-rendering-looks-modern-and-tough-104249-7.jpg',
    nom: 'bmw i5 SUV',
    marque: 'bmw',
    prix: 170,
    carburant: 'Électrique',
    personnes: 5
  },
  {
    image: 'https://img.chceauto.pl/mercedes-benz/gls/mercedes-benz-gls-suv-4277-45862_v1.jpg',
    nom: 'mercedes gls 2020',
    marque: 'mercedes',
    prix: 180,
    carburant: 'Électrique',
    personnes: 7
  },
  {
    image: 'https://img.chceauto.pl/mercedes-benz/gls/mercedes-benz-gls-suv-4277-45862_v1.jpg',
    nom: 'Volkswagen Touareg V8',
    marque: 'volkswagen',
    prix: 180,
    carburant: 'Diesel',
    personnes: 4
  },
  {
    image: 'https://performancedrive.com.au/wp-content/uploads/2012/03/2013-Audi-A3-03-1280x954.jpg',
    nom: 'audi a3',
    marque: 'audi',
    prix: 60,
    carburant: 'Diesel',
    personnes: 4
  },
  {
    image: 'https://static1.hotcarsimages.com/wordpress/wp-content/uploads/2020/04/feature-image-chevy-impala.jpg',
    nom: 'Chevrolet Impala',
    marque: 'chevrolet',
    prix: 50,
    carburant: 'Diesel',
    personnes: 4
  },
  
  // Ajoutez d'autres objets pour chaque voiture
];

const voituresGrid = document.getElementById('voituresGrid');

function genererGrilleVoitures(voituresList) {
  let html = '';
  if (voituresList.length === 0) {
    html = `
      <p>Aucune voiture ne correspond aux critères de recherche.</p>
      <p>Le site est factice et propose une sélection restreinte de voitures.</p>
    `;
  } else {
    voituresList.forEach(voiture => {
      html += `
        <div class="voiture">
          <img src="${voiture.image}" alt="${voiture.nom}">
          <h3>${voiture.nom}</h3>
          <p>${voiture.marque}</p>
          <ul>
            <li>${voiture.prix}$/mois</li>
            <li>${voiture.carburant}</li>
            <li>Nombre de personnes : ${voiture.personnes}</li>
            <!-- ... -->
          </ul>
        </div>
      `;
    });
  }
  voituresGrid.innerHTML = html;
}


window.onload = function () {
  genererGrilleVoitures(voitures);
};
// trier

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('tri').addEventListener('change', function (event) {
    const critereTri = event.target.value;
    const ordreTri=document.getElementById("ordre");
    if (critereTri === 'price') {
      trierParPrix('croissant'); // Appel de tri croissant par défaut
    } else if (critereTri === 'marque') {
      trierParMarque();
    } else {
      afficherMessageCritereNonPrisEnCompte();
    }
  });
});

function trierParPrix(ordreTri) {
  if (ordreTri === 'croissant') {
    voitures.sort((a, b) => a.prix - b.prix);
    console.log("Tri croissant");
  } else if (ordreTri === "decroissant") {
    voitures.sort((a, b) => b.prix - a.prix);
    console.log("Tri decroissant");
  }
  genererGrilleVoitures(voitures);
}

function trierParMarque() {
  voitures.sort((a, b) => {
    const marqueA = a.marque.toLowerCase();
    const marqueB = b.marque.toLowerCase();
    if (marqueA < marqueB) return -1;
    if (marqueA > marqueB) return 1;
    return 0;
  });
  genererGrilleVoitures(voitures);
}


function afficherMessageCritereNonPrisEnCompte() {
  alert("Année et kilométrage ne sont pas pris en compte pour ce tri.");
}

const elementsFiltrage = document.querySelectorAll('.filter input, .filter select');

elementsFiltrage.forEach(element => {
  element.addEventListener('input', appliquerFiltres);
});

function appliquerFiltres() {
  // ... (autres filtres)

  const prixMax = parseFloat(document.getElementById('prix_max').value);
  const prixMin = parseFloat(document.getElementById('prix_min').value);
  const marqueSelectionnee = document.getElementById('filtre_marque').value;
  const capaciteMax = parseFloat(document.getElementById("capacite").value);
  const essenceChecked = document.getElementById('essence').checked;
  const dieselChecked = document.getElementById('diesel').checked;
  const electriqueChecked = document.getElementById('electrique').checked;

  const voituresFiltreesParPrix = !isNaN(prixMax) && !isNaN(prixMin)? voitures.filter(voiture => {
    return (voiture.prix >= prixMin) && (voiture.prix <= prixMax);
    
  }):voitures;
  console.log(voituresFiltreesParPrix);
  const voituresFiltreesParMarque = marqueSelectionnee !== 'toutes' ? voituresFiltreesParPrix.filter(voiture => voiture.marque === marqueSelectionnee) : voituresFiltreesParPrix;
console.log(voituresFiltreesParMarque)
  const voituresFiltreesParCarburant = voituresFiltreesParMarque.filter(voiture => {
    return (essenceChecked && voiture.carburant === 'Essence') || (dieselChecked && voiture.carburant === 'Diesel') || (electriqueChecked && voiture.carburant === 'Électrique');
  });
console.log(voituresFiltreesParCarburant)
const voituresFiltreesParCapacite = !isNaN(capaciteMax) ? voituresFiltreesParCarburant.filter(voiture => {
  return (voiture.personnes >= capaciteMax);
}) : voituresFiltreesParCarburant;

console.log(voituresFiltreesParCapacite)
  genererGrilleVoitures(voituresFiltreesParCapacite);
  // ...
}
// Récupérez l'élément de la barre de recherche
const inputRecherche = document.getElementById('recherche');

// Ajoutez un événement d'écoute pour détecter les modifications dans la barre de recherche
inputRecherche.addEventListener('input', function(event) {
  const termeRecherche = event.target.value.toLowerCase(); // Récupérez le texte saisi par l'utilisateur

  // Filtrer les voitures en fonction du terme de recherche
  const voituresFiltrees = voitures.filter(voiture => {
    // Vérifiez si le terme de recherche correspond au nom de la voiture ou à sa marque
    return (
      voiture.nom.toLowerCase().includes(termeRecherche) ||
      voiture.marque.toLowerCase().includes(termeRecherche)
    );
  });

  // Mettez à jour la grille avec les résultats filtrés
  genererGrilleVoitures(voituresFiltrees);
});
