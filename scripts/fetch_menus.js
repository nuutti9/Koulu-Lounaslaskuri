const fs = require('fs');

const schools = [
    { id: "alavus", name: "Alavus (Kyläkoulut)", customer: "alavus", kitchen: "alavudenkyläkoulut", menu: "alavudenkoulut" },
    { id: "eurajoki", name: "Eurajoki", customer: "eurajoki", kitchen: "koulut", menu: "koulukeskus" },
    { id: "ikaalinen", name: "Ikaalinen", customer: "ikaalinen", kitchen: "koulut", menu: "ruokalista" },
    { id: "kalajoki", name: "Kalajoki", customer: "kalajoki", kitchen: "koulut", menu: "ruokalista" },
    { id: "kannus", name: "Kannus", customer: "kannus", kitchen: "koulut", menu: "koulut" },
    { id: "kauhava", name: "Kauhava", customer: "kauhava", kitchen: "koulut", menu: "ruokalista" },
    { id: "kauniainen", name: "Kauniainen", customer: "kauniainen", kitchen: "koulut", menu: "koulu" },
    { id: "kirkkonummi", name: "Kirkkonummi", customer: "kirkkonummi", kitchen: "koulut", menu: "ruokalista" },
    { id: "laukaa", name: "Laukaa", customer: "laukaa", kitchen: "koulu", menu: "Ruokalista" },
    { id: "lieto", name: "Lieto", customer: "lieto", kitchen: "koulut", menu: "kouluruokalista" },
    { id: "muhos", name: "Muhos", customer: "muhosutajarvivaala", kitchen: "muhoskoulut", menu: "ruokalista" },
    { id: "utajarvi", name: "Utajärvi", customer: "muhosutajarvivaala", kitchen: "muhoskoulut", menu: "ruokalista" },
    { id: "vaala", name: "Vaala", customer: "muhosutajarvivaala", kitchen: "muhoskoulut", menu: "ruokalista" },
    { id: "nousiainen", name: "Nousiainen", customer: "nousiainen", kitchen: "koulut", menu: "koulut" },
    { id: "orimattila", name: "Orimattila", customer: "orimattila", kitchen: "koulut", menu: "Koulut" },
    { id: "rusko", name: "Rusko", customer: "rusko", kitchen: "koulut", menu: "ruskonkoulut" },
    { id: "sipoo", name: "Sipoo", customer: "sipoo", kitchen: "koulut", menu: "ruokalistakoulut" },
    { id: "somero", name: "Somero", customer: "somero", kitchen: "koulut", menu: "japaivakodit" },
    { id: "ulvila", name: "Ulvila", customer: "ulvila", kitchen: "harjunpaa", menu: "koulut" },
    { id: "hyria", name: "Hyria", customer: "hyria", kitchen: "tuotanto", menu: "Ruokalista" },
    { id: "lappia", name: "Lappia", customer: "lappia", kitchen: "aurinko", menu: "aurinko" },
    { id: "luovi", name: "Ammattiopisto Luovi", customer: "luovi", kitchen: "ravintolakasari", menu: "ravintolakasari" },
    { id: "sskky", name: "SSKKY", customer: "sskky", kitchen: "ravintolasatama", menu: "Salonseudunkoulutuskuntayhtymä" },
    { id: "winnova_pori", name: "WinNova (Pori)", customer: "winnova", kitchen: "pori", menu: "ruokalista" },
    { id: "winnova_rauma", name: "WinNova (Rauma)", customer: "winnova", kitchen: "Rauma", menu: "ruokalista" }
];

async function fetchMenus() {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'Europe/Helsinki',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const datesToFetch = [];
    // Haetaan 7 päivää eteenpäin alkaen tästä päivästä
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        datesToFetch.push(formatter.format(d));
    }
    const dateStr = datesToFetch.join(',');
    const results = {};

    for (const school of schools) {
        const url = `https://api.fi.poweresta.com/publicmenu/dates/${encodeURIComponent(school.customer)}/${encodeURIComponent(school.kitchen)}/?menu=${encodeURIComponent(school.menu)}&dates=${dateStr}`;
        console.log(`Fetching ${school.name}...`);
        try {
            const response = await fetch(url);
            if (response.ok) {
                results[school.id] = await response.json();
            } else {
                console.error(`Failed to fetch ${school.name}: ${response.status}`);
                results[school.id] = null;
            }
        } catch (error) {
            console.error(`Error fetching ${school.name}:`, error.message);
            results[school.id] = null;
        }
    }

    // Also write schools list for frontend to use mapping
    const schoolsList = schools.map(s => ({ id: s.id, name: s.name }));
    fs.writeFileSync('schools.json', JSON.stringify(schoolsList, null, 2));

    fs.writeFileSync('menus.json', JSON.stringify(results, null, 2));
    console.log('Saved menus.json and schools.json');
}

fetchMenus();
