export type HelpOption = {
  label: string;
  description: string;
};

export type HelpEntry = {
  title: string;
  intro: string;
  options: HelpOption[];
  next: string;
};

export const helpContent: Record<string, HelpEntry> = {
  "/setup": {
    title: "Instellingen",
    intro: "Start hier. Stel je toernooi in, voeg teams toe en loot de groepen.",
    options: [
      {
        label: "Naam, Datum",
        description: "Toernooi-metadata die terugkomt op exports.",
      },
      {
        label: "Velden",
        description:
          "Aantal speelvelden tegelijk beschikbaar (bepaalt hoeveel matchen parallel lopen).",
      },
      {
        label: "Tijdslot (min)",
        description: "Duur van één wedstrijd-slot inclusief wissel.",
      },
      {
        label: "Starttijd",
        description: "Eerste aftrap van de dag.",
      },
      {
        label: "Teams (per competitie)",
        description:
          'Typ een naam + Enter of "Toevoegen". Klik × om te verwijderen.',
      },
      {
        label: "Groepsindeling",
        description: "Kies hoeveel groepen (min. 6 teams nodig).",
      },
      {
        label: "Doorgang per groep",
        description: "Top N uit elke groep gaat door naar de knock-out.",
      },
      {
        label: "Groepen loten",
        description:
          "Genereert willekeurige groepen, schema én knock-out-bracket. Je kunt de loting herzien voor je bevestigt.",
      },
    ],
    next: "Klaar? Ga naar Groepen om de stand per poule te zien en scores in te vullen.",
  },
  "/groups": {
    title: "Groepen",
    intro: "Volg de stand per groep en vul wedstrijduitslagen in.",
    options: [
      {
        label: "Heren / Dames schakelaar",
        description: "Wissel tussen competities.",
      },
      {
        label: "Groepstabel",
        description:
          "Live stand (punten, doelsaldo). Gekleurde rijen = doorgang. Ster-symbool = beste-volgende-kandidaat.",
      },
      {
        label: "Wedstrijdkaart (klik)",
        description: "Opent scorepopup om uitslag in te vullen of te wijzigen.",
      },
      {
        label: "Beste volgende",
        description:
          "Aparte tabel onderaan als niet alle doorgangplekken direct uit de groep komen.",
      },
    ],
    next: "Vul alle groepswedstrijden in en bekijk dan het volledige tijdschema op Schema.",
  },
  "/schedule": {
    title: "Schema",
    intro:
      "Zie het complete dagschema per veld en tijdslot. Hier start je ook de knock-outfase.",
    options: [
      {
        label: "Filter (Alles / Heren / Dames)",
        description: "Beperk de weergave tot één competitie.",
      },
      {
        label: "Schema-grid",
        description:
          "Rijen = tijdsloten, kolommen = velden. Klik een wedstrijd om de score in te vullen.",
      },
      {
        label: "Pauze toevoegen / aanpassen",
        description:
          "Voeg pauzes in tussen tijdsloten; alle latere tijden schuiven op.",
      },
      {
        label: "Knock-outfase genereren",
        description:
          "Verschijnt zodra alle groepswedstrijden gespeeld zijn. Zet de gekwalificeerde teams in de bracket.",
      },
    ],
    next: "Na de groepsfase: genereer de knock-out en volg de bracket op Knock-out.",
  },
  "/knockouts": {
    title: "Knock-out",
    intro: "Volg de bracket tot en met de finale.",
    options: [
      {
        label: "Filter (Alles / Heren / Dames)",
        description: "Toon één of beide brackets.",
      },
      {
        label: "Bracket",
        description:
          "Klik een wedstrijd om de score (en eventueel penalty's) in te vullen. Winnaars schuiven automatisch door.",
      },
      {
        label: "Kampioen-banner",
        description: "Verschijnt zodra de finale beslist is.",
      },
    ],
    next: "Toernooi afgerond — exporteer de uitslag via de knop bovenaan.",
  },
};
