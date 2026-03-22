/**
 * Seed the CNIL database with sample decisions and guidelines for testing.
 *
 * Includes real CNIL decisions (Clearview AI, TikTok, Microsoft, Google)
 * and representative guidance documents so MCP tools can be tested without
 * running a full data ingestion pipeline.
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force   # drop and recreate
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["CNIL_DB_PATH"] ?? "data/cnil.db";
const force = process.argv.includes("--force");

// --- Bootstrap database ------------------------------------------------------

const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted existing database at ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

console.log(`Database initialised at ${DB_PATH}`);

// --- Topics ------------------------------------------------------------------

interface TopicRow {
  id: string;
  name_fr: string;
  name_en: string;
  description: string;
}

const topics: TopicRow[] = [
  {
    id: "consent",
    name_fr: "Consentement",
    name_en: "Consent",
    description: "Recueil, validité et retrait du consentement au traitement de données personnelles (art. 7 RGPD).",
  },
  {
    id: "cookies",
    name_fr: "Cookies et traceurs",
    name_en: "Cookies and trackers",
    description: "Dépôt et lecture de cookies et traceurs sur les terminaux des utilisateurs (art. 82 loi Informatique et Libertés).",
  },
  {
    id: "transfers",
    name_fr: "Transferts internationaux",
    name_en: "International transfers",
    description: "Transferts de données personnelles vers des pays tiers ou des organisations internationales (art. 44–49 RGPD).",
  },
  {
    id: "dpia",
    name_fr: "Analyse d'impact (AIPD)",
    name_en: "Data Protection Impact Assessment (DPIA)",
    description: "Évaluation des risques sur les droits et libertés des personnes pour les traitements à risque élevé (art. 35 RGPD).",
  },
  {
    id: "breach_notification",
    name_fr: "Violation de données",
    name_en: "Data breach notification",
    description: "Notification des violations de données à la CNIL et aux personnes concernées (art. 33–34 RGPD).",
  },
  {
    id: "privacy_by_design",
    name_fr: "Protection des données dès la conception",
    name_en: "Privacy by design",
    description: "Intégration de la protection des données dès la conception et par défaut (art. 25 RGPD).",
  },
  {
    id: "employee_monitoring",
    name_fr: "Surveillance des salariés",
    name_en: "Employee monitoring",
    description: "Traitements de données dans le cadre des relations de travail et surveillance des employés.",
  },
  {
    id: "health_data",
    name_fr: "Données de santé",
    name_en: "Health data",
    description: "Traitement de données de santé — catégories particulières soumises à des garanties renforcées (art. 9 RGPD).",
  },
  {
    id: "children",
    name_fr: "Données des mineurs",
    name_en: "Children's data",
    description: "Protection des données des mineurs, notamment dans les services en ligne (art. 8 RGPD).",
  },
];

const insertTopic = db.prepare(
  "INSERT OR IGNORE INTO topics (id, name_fr, name_en, description) VALUES (?, ?, ?, ?)",
);

for (const t of topics) {
  insertTopic.run(t.id, t.name_fr, t.name_en, t.description);
}

console.log(`Inserted ${topics.length} topics`);

// --- Decisions ---------------------------------------------------------------

interface DecisionRow {
  reference: string;
  title: string;
  date: string;
  type: string;
  entity_name: string;
  fine_amount: number | null;
  summary: string;
  full_text: string;
  topics: string;
  gdpr_articles: string;
  status: string;
}

const decisions: DecisionRow[] = [
  // SAN-2022-009 — Clearview AI
  {
    reference: "SAN-2022-009",
    title: "Délibération SAN-2022-009 — Clearview AI",
    date: "2022-10-17",
    type: "sanction",
    entity_name: "Clearview AI",
    fine_amount: 20_000_000,
    summary:
      "La CNIL a sanctionné Clearview AI d'une amende de 20 millions d'euros pour collecte illicite de photos de visages à grande échelle sur internet, absence de base légale, et refus de coopérer avec la CNIL. Clearview AI traitait des données biométriques de résidents français sans leur consentement ni autre base légale valable.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 20 000 000 euros à l'encontre de la société Clearview AI. La société Clearview AI collecte des milliards de photographies de visages publiquement disponibles sur internet afin de constituer une base de données biométriques. Ces données sont ensuite utilisées pour proposer un service de reconnaissance faciale permettant d'identifier des individus à partir d'une photo. La formation restreinte a constaté : (1) une absence de base légale pour le traitement de données biométriques de résidents français — le consentement n'a pas été recueilli et aucune autre base légale n'est applicable ; (2) le non-respect des droits des personnes — les demandes d'accès, d'effacement et d'opposition ont été ignorées ou traitées de manière insuffisante ; (3) un refus de coopérer avec la CNIL lors de la procédure de contrôle. La CNIL a ordonné à Clearview AI de cesser la collecte et le traitement de données de résidents français et de supprimer les données déjà collectées dans un délai de deux mois.",
    topics: JSON.stringify(["transfers", "consent", "health_data"]),
    gdpr_articles: JSON.stringify(["6", "9", "12", "15", "17", "21"]),
    status: "final",
  },
  // SAN-2021-023 — Google LLC (cookies)
  {
    reference: "SAN-2021-023",
    title: "Délibération SAN-2021-023 — Google LLC",
    date: "2022-01-06",
    type: "sanction",
    entity_name: "Google LLC",
    fine_amount: 150_000_000,
    summary:
      "La CNIL a sanctionné Google LLC d'une amende de 150 millions d'euros pour non-conformité des mécanismes de refus des cookies sur les sites google.fr et youtube.com. Le bouton de refus des cookies était difficile à trouver et nécessitait plus de clics que le bouton d'acceptation.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 150 000 000 euros à l'encontre de la société Google LLC et une sanction de 60 000 000 euros à l'encontre de la société Google Ireland Limited. Les sites google.fr et youtube.com proposaient un bouton permettant d'accepter immédiatement les cookies mais ne prévoyaient pas de solution équivalente (bouton ou lien) pour refuser le dépôt de cookies aussi simplement qu'il était possible de les accepter. Cette pratique avait pour effet de décourager les utilisateurs de refuser les cookies et de les inciter à choisir la solution la plus simple consistant à accepter tous les cookies. La CNIL a rappelé qu'en matière de cookies, le consentement doit être libre, c'est-à-dire que les utilisateurs doivent pouvoir accepter ou refuser les traceurs aussi facilement. Les sociétés ont été mises en demeure de remédier à ces manquements dans un délai de trois mois sous peine d'une astreinte.",
    topics: JSON.stringify(["cookies", "consent"]),
    gdpr_articles: JSON.stringify(["7"]),
    status: "final",
  },
  // SAN-2022-020 — Microsoft (cookies)
  {
    reference: "SAN-2022-020",
    title: "Délibération SAN-2022-020 — Microsoft Ireland Operations Limited",
    date: "2022-12-22",
    type: "sanction",
    entity_name: "Microsoft Ireland Operations Limited",
    fine_amount: 60_000_000,
    summary:
      "La CNIL a sanctionné Microsoft d'une amende de 60 millions d'euros pour avoir déposé des cookies publicitaires sur les terminaux des utilisateurs du moteur de recherche Bing sans recueillir leur consentement préalable, et pour avoir rendu le refus des cookies plus difficile que leur acceptation.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 60 000 000 euros à l'encontre de la société Microsoft Ireland Operations Limited. Les contrôles menés sur le moteur de recherche Bing ont révélé les manquements suivants : (1) le site Bing déposait des cookies publicitaires sans recueillir le consentement préalable des utilisateurs — des cookies à finalité publicitaire étaient déposés dès l'arrivée sur le site, sans aucune action de l'utilisateur ; (2) absence de mécanisme de refus aussi simple que celui d'acceptation — un bouton d'acceptation de tous les cookies était directement proposé sur le bandeau cookies mais aucun bouton équivalent permettant de les refuser en un clic n'était présent ; (3) le système de désinscription publicitaire de Microsoft (opt-out) ne permettait pas de stopper le dépôt des cookies publicitaires mais seulement d'en limiter les effets. La CNIL a mis en demeure Microsoft de se conformer dans un délai de trois mois.",
    topics: JSON.stringify(["cookies", "consent"]),
    gdpr_articles: JSON.stringify(["7"]),
    status: "final",
  },
  // SAN-2023-003 — TikTok
  {
    reference: "SAN-2023-003",
    title: "Délibération SAN-2023-003 — TikTok Information Technologies UK Limited et TikTok Technology Limited",
    date: "2023-06-15",
    type: "sanction",
    entity_name: "TikTok",
    fine_amount: 5_000_000,
    summary:
      "La CNIL a sanctionné TikTok d'une amende de 5 millions d'euros pour avoir rendu le refus des cookies plus difficile que leur acceptation sur le site tiktok.com et pour ne pas avoir informé les utilisateurs de façon suffisamment précise des finalités des cookies.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 5 000 000 euros à l'encontre des sociétés TikTok Information Technologies UK Limited et TikTok Technology Limited. Sur le site tiktok.com, les contrôles ont révélé : (1) l'absence de bouton permettant de refuser les cookies aussi simplement que de les accepter — pour refuser les cookies, l'utilisateur devait cliquer sur Gérer les cookies, puis décocher les différentes finalités proposées et enfin cliquer sur Confirmer ; (2) les informations fournies aux utilisateurs sur les finalités des cookies n'étaient pas suffisamment précises pour leur permettre de comprendre à quoi ces cookies allaient servir. La CNIL a prononcé une injonction de mise en conformité assortie d'une astreinte de 1 000 euros par jour de retard.",
    topics: JSON.stringify(["cookies", "consent"]),
    gdpr_articles: JSON.stringify(["7"]),
    status: "final",
  },
  // SAN-2022-003 — Google Analytics transfer
  {
    reference: "SAN-2022-003",
    title: "Délibération SAN-2022-003 — Utilisation de Google Analytics",
    date: "2022-02-10",
    type: "mise_en_demeure",
    entity_name: "Éditeur de site web anonyme",
    fine_amount: null,
    summary:
      "La CNIL a mis en demeure un éditeur de site web pour l'utilisation de Google Analytics, qui entraîne un transfert de données personnelles des visiteurs vers les États-Unis sans garanties suffisantes au sens du RGPD.",
    full_text:
      "La CNIL a adopté une mise en demeure à l'encontre d'un gestionnaire de site web qui utilise Google Analytics. L'utilisation de cet outil entraîne le transfert de données vers les États-Unis, pays qui ne dispose pas d'un niveau de protection des données adéquat au sens du RGPD. La CNIL a analysé les mesures complémentaires mises en place par Google et a constaté qu'elles ne permettent pas d'exclure la possibilité que des services de renseignement américains accèdent à ces données. En effet, les États-Unis ne disposent pas d'une protection équivalente à celle garantie dans l'Union européenne pour ce type de données. Cette mise en demeure s'inscrit dans le contexte de l'invalidation du Privacy Shield par la Cour de justice de l'Union européenne (arrêt Schrems II du 16 juillet 2020). La CNIL a enjoint au gestionnaire du site de mettre en conformité ces traitements, si nécessaire en cessant d'utiliser Google Analytics dans les conditions actuelles ou en recourant à un outil ne procédant pas à de tels transferts.",
    topics: JSON.stringify(["transfers", "cookies"]),
    gdpr_articles: JSON.stringify(["44", "46"]),
    status: "final",
  },
  // SAN-2019-001 — Sergic
  {
    reference: "SAN-2019-001",
    title: "Délibération SAN-2019-001 — Sergic",
    date: "2019-05-28",
    type: "sanction",
    entity_name: "Sergic",
    fine_amount: 400_000,
    summary:
      "La CNIL a sanctionné Sergic, agence immobilière en ligne, d'une amende de 400 000 euros pour avoir conservé des données personnelles au-delà de la durée nécessaire et pour des insuffisances en matière de sécurité, notamment l'exposition de pièces justificatives de candidats via des URL prévisibles.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 400 000 euros à l'encontre de la société Sergic. Les contrôles ont mis en évidence : (1) une durée de conservation excessive — des milliers de candidatures et leurs pièces justificatives (pièces d'identité, bulletins de salaire, relevés bancaires) étaient conservées sans limitation de durée alors que les dossiers avaient abouti à une location ou avaient été rejetés ; (2) des insuffisances en matière de sécurité — les pièces justificatives téléchargées par les candidats étaient accessibles via des URL prévisibles, permettant à quiconque connaissant la structure des URL d'accéder aux documents d'autres candidats sans authentification. La société n'avait pas mis en place de mesures de sécurité adaptées à la sensibilité des données traitées.",
    topics: JSON.stringify(["privacy_by_design"]),
    gdpr_articles: JSON.stringify(["5", "25", "32"]),
    status: "final",
  },
  // SAN-2019-005 — Futura Internationale
  {
    reference: "SAN-2019-005",
    title: "Délibération SAN-2019-005 — Futura Internationale",
    date: "2019-12-19",
    type: "sanction",
    entity_name: "Futura Internationale",
    fine_amount: 500_000,
    summary:
      "La CNIL a sanctionné Futura Internationale, société de vente à distance, pour prospection commerciale sans consentement et conservation des données au-delà des durées légales.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 500 000 euros à l'encontre de la société Futura Internationale. La société collectait des données personnelles auprès de partenaires et les utilisait à des fins de prospection commerciale téléphonique sans s'assurer que les personnes avaient valablement consenti à être démarchées. Elle conservait également les données de prospects pendant des durées excessives. La CNIL a rappelé que le consentement à la prospection commerciale doit être libre, spécifique, éclairé et univoque.",
    topics: JSON.stringify(["consent"]),
    gdpr_articles: JSON.stringify(["5", "6", "7"]),
    status: "final",
  },
  // SAN-2022-018 — Discord
  {
    reference: "SAN-2022-018",
    title: "Délibération SAN-2022-018 — Discord Inc.",
    date: "2022-11-10",
    type: "sanction",
    entity_name: "Discord Inc.",
    fine_amount: 800_000,
    summary:
      "La CNIL a sanctionné Discord d'une amende de 800 000 euros pour des manquements relatifs à la durée de conservation des données, à la sécurité (conservation des mots de passe en clair dans les journaux) et à la réalisation d'une analyse d'impact.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 800 000 euros à l'encontre de Discord Inc. Les contrôles ont mis en évidence les manquements suivants : (1) défaut de limitation de la durée de conservation — les données des comptes inactifs depuis deux ans n'étaient pas supprimées automatiquement, contrairement à ce qu'indiquait la politique de confidentialité de Discord ; (2) insuffisances en matière de sécurité — des mots de passe d'utilisateurs étaient stockés en clair dans les journaux techniques de l'application, sans durée de rétention définie ; (3) absence d'analyse d'impact relative à la protection des données (AIPD) alors que la plateforme traite des données personnelles de mineurs et que ses traitements présentent des risques élevés pour les droits et libertés. Discord a procédé à des mises en conformité en cours de procédure qui ont été prises en compte dans la fixation du montant de la sanction.",
    topics: JSON.stringify(["dpia", "privacy_by_design", "children"]),
    gdpr_articles: JSON.stringify(["5", "25", "32", "35"]),
    status: "final",
  },
  // SAN-2021-019 — BOULANGER
  {
    reference: "SAN-2021-019",
    title: "Délibération SAN-2021-019 — BOULANGER",
    date: "2021-12-09",
    type: "sanction",
    entity_name: "BOULANGER",
    fine_amount: 3_000_000,
    summary:
      "La CNIL a sanctionné BOULANGER d'une amende de 3 millions d'euros pour avoir insuffisamment sécurisé les données personnelles de ses clients et pour avoir envoyé des emails commerciaux sans consentement.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 3 000 000 euros à l'encontre de la société BOULANGER. Un contrôle réalisé à la suite d'une violation de données a mis en évidence : (1) des insuffisances en matière de sécurité — les données de 500 000 clients étaient accessibles via l'application mobile sans authentification suffisante en raison d'une faille dans l'API ; les mots de passe des comptes clients étaient stockés en utilisant l'algorithme SHA-1 sans salage, qui est considéré comme insuffisant au regard de l'état de l'art ; (2) des envois de messages électroniques à des fins de prospection commerciale sans le consentement préalable des personnes concernées — BOULANGER contactait par email des personnes qui n'avaient pas coché la case relative à la réception de communications commerciales.",
    topics: JSON.stringify(["consent", "privacy_by_design"]),
    gdpr_articles: JSON.stringify(["6", "32"]),
    status: "final",
  },
  // SAN-2022-001 — Free Mobile (violation notification)
  {
    reference: "SAN-2022-001",
    title: "Délibération SAN-2022-001 — Free Mobile",
    date: "2022-01-06",
    type: "sanction",
    entity_name: "Free Mobile",
    fine_amount: 300_000,
    summary:
      "La CNIL a sanctionné Free Mobile pour une notification de violation de données personnelles tardive et incomplète, et pour des insuffisances dans la sécurisation des données de ses abonnés.",
    full_text:
      "La formation restreinte de la CNIL a prononcé une sanction de 300 000 euros à l'encontre de la société Free Mobile. Suite à une violation de données ayant affecté les données personnelles de plusieurs millions d'abonnés (noms, prénoms, adresses email, numéros de téléphone, dates de naissance, coordonnées bancaires pour une partie d'entre eux), la CNIL a constaté : (1) notification tardive de la violation — Free Mobile n'a notifié la violation à la CNIL que 19 jours après en avoir pris connaissance, alors que le délai réglementaire est de 72 heures ; (2) notification incomplète — la notification transmise à la CNIL ne comprenait pas toutes les informations requises par l'article 33 du RGPD ; (3) insuffisances en matière de sécurité des données — des mots de passe d'abonnés étaient conservés sous forme insuffisamment sécurisée.",
    topics: JSON.stringify(["breach_notification", "privacy_by_design"]),
    gdpr_articles: JSON.stringify(["32", "33"]),
    status: "final",
  },
];

const insertDecision = db.prepare(`
  INSERT OR IGNORE INTO decisions
    (reference, title, date, type, entity_name, fine_amount, summary, full_text, topics, gdpr_articles, status)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertDecisionsAll = db.transaction(() => {
  for (const d of decisions) {
    insertDecision.run(
      d.reference,
      d.title,
      d.date,
      d.type,
      d.entity_name,
      d.fine_amount,
      d.summary,
      d.full_text,
      d.topics,
      d.gdpr_articles,
      d.status,
    );
  }
});

insertDecisionsAll();
console.log(`Inserted ${decisions.length} decisions`);

// --- Guidelines --------------------------------------------------------------

interface GuidelineRow {
  reference: string | null;
  title: string;
  date: string;
  type: string;
  summary: string;
  full_text: string;
  topics: string;
  language: string;
}

const guidelines: GuidelineRow[] = [
  {
    reference: "CNIL-GUIDE-COOKIES-2020",
    title: "Lignes directrices relatives aux cookies et autres traceurs",
    date: "2020-09-17",
    type: "recommandation",
    summary:
      "Lignes directrices de la CNIL sur le recueil du consentement pour les cookies et traceurs. Précise les conditions de validité du consentement, les exigences relatives aux bandeaux cookies, et les modalités de refus. Applicable à tous les sites web et applications mobiles visant des résidents français.",
    full_text:
      "La CNIL a adopté de nouvelles lignes directrices relatives aux cookies et autres traceurs de connexion pour prendre en compte les évolutions réglementaires du RGPD et de la directive ePrivacy. Ces lignes directrices s'appliquent à tout dépôt ou lecture de cookies et traceurs sur le terminal d'un utilisateur situé en France. Principales exigences : (1) Consentement valide — le consentement doit être libre (absence de cookie wall sauf exceptions justifiées), spécifique (par finalité), éclairé (information claire) et univoque (action positive) ; (2) Refus aussi simple que l'acceptation — le bandeau cookies doit proposer un moyen de refuser les cookies aussi facilement que de les accepter, idéalement via un bouton «Refuser» au même niveau que le bouton «Accepter» ; (3) Pas de cookies avant consentement — aucun cookie non essentiel ne doit être déposé avant l'expression du choix de l'utilisateur ; (4) Durée de validité du consentement — le consentement doit être renouvelé au moins tous les 13 mois ; (5) Preuve du consentement — le responsable de traitement doit être en mesure de prouver qu'un consentement valide a été recueilli ; (6) Cookies exemptés — certains cookies strictement nécessaires au fonctionnement du site sont exemptés de consentement (cookies de session, cookies de panier, cookies d'authentification). La recommandation publiée le 17 septembre 2020 précise les modalités pratiques de mise en conformité.",
    topics: JSON.stringify(["cookies", "consent"]),
    language: "fr",
  },
  {
    reference: "CNIL-GUIDE-AIPD-2022",
    title: "Guide AIPD — Analyse d'impact relative à la protection des données",
    date: "2022-10-04",
    type: "guide",
    summary:
      "Guide méthodologique de la CNIL pour réaliser une analyse d'impact relative à la protection des données (AIPD / DPIA). Explique quand une AIPD est obligatoire, comment l'articuler autour des trois étapes (description du traitement, évaluation des risques, validation), et les documents à produire.",
    full_text:
      "L'article 35 du RGPD impose la réalisation d'une analyse d'impact relative à la protection des données (AIPD) lorsqu'un traitement est susceptible d'engendrer un risque élevé pour les droits et libertés des personnes concernées. Ce guide pratique accompagne les responsables de traitement dans la réalisation de leurs AIPD. Quand réaliser une AIPD ? Une AIPD est obligatoire notamment pour : les traitements à grande échelle de données sensibles (santé, opinions politiques, données biométriques), la surveillance systématique de personnes dans des espaces publics, les traitements de scoring ou de profilage ayant des effets significatifs, les traitements impliquant des personnes vulnérables (mineurs, patients). La CNIL publie et maintient une liste des types de traitements pour lesquels une AIPD est requise. Les trois étapes d'une AIPD : (1) Description du traitement — finalités, données traitées, destinataires, transferts, durée de conservation, mesures de sécurité ; (2) Évaluation de la nécessité et de la proportionnalité — vérification que le traitement est licite, que les données collectées sont adéquates, pertinentes et limitées, que les droits des personnes peuvent s'exercer ; (3) Gestion des risques — identification des risques sur la vie privée (accès non légitime, modification non désirée, disparition), évaluation de leur gravité et probabilité, identification des mesures complémentaires. L'AIPD doit être documentée et mise à jour lors de toute modification significative du traitement. La CNIL met à disposition un logiciel libre PIA (Privacy Impact Assessment) pour faciliter la réalisation des AIPD.",
    topics: JSON.stringify(["dpia", "privacy_by_design"]),
    language: "fr",
  },
  {
    reference: "CNIL-GUIDE-VIOLATION-2021",
    title: "Guide pratique — Violations de données personnelles",
    date: "2021-05-25",
    type: "guide",
    summary:
      "Guide pratique de la CNIL sur la gestion des violations de données personnelles. Détaille les obligations de notification à la CNIL (72h) et aux personnes concernées, les informations à fournir, et les mesures de sécurité pour prévenir les violations.",
    full_text:
      "En cas de violation de données personnelles, le responsable de traitement est soumis à des obligations précises définies aux articles 33 et 34 du RGPD. Qu'est-ce qu'une violation de données ? Une violation de données est une violation de la sécurité entraînant, de manière accidentelle ou illicite, la destruction, la perte, l'altération, la divulgation non autorisée de données à caractère personnel ou l'accès non autorisé à de telles données. Exemples : intrusion informatique, envoi d'email à un mauvais destinataire, perte d'un ordinateur portable non chiffré, attaque par rançongiciel. Notification à la CNIL (art. 33 RGPD) : toute violation présentant un risque pour les droits et libertés des personnes doit être notifiée à la CNIL dans les 72 heures suivant sa découverte. La notification doit contenir : la nature de la violation, les catégories et nombre approximatif de personnes et d'enregistrements concernés, les conséquences probables, les mesures prises ou envisagées. Si la notification ne peut être complète dans les 72 heures, elle peut être faite en plusieurs étapes. Notification aux personnes (art. 34 RGPD) : lorsque la violation est susceptible d'engendrer un risque élevé, les personnes concernées doivent également être notifiées dans les meilleurs délais. La notification aux personnes n'est pas requise si des mesures techniques de protection appropriées ont été appliquées (chiffrement) ou si elle nécessiterait des efforts disproportionnés. Les violations sans risque pour les personnes doivent être documentées en interne mais ne nécessitent pas de notification à la CNIL.",
    topics: JSON.stringify(["breach_notification"]),
    language: "fr",
  },
  {
    reference: "CNIL-REFERENTIEL-SANTE-2021",
    title: "Référentiel — Entrepôts de données de santé",
    date: "2021-01-21",
    type: "referentiel",
    summary:
      "Référentiel de la CNIL pour les entrepôts de données de santé. Définit les conditions dans lesquelles un entrepôt de données de santé peut être constitué et exploité en conformité avec le RGPD et la réglementation spécifique aux données de santé.",
    full_text:
      "Les données de santé constituent une catégorie particulière de données sensibles soumises à des garanties renforcées en vertu de l'article 9 du RGPD. La constitution d'un entrepôt de données de santé nécessite une base légale spécifique et le respect d'exigences techniques et organisationnelles strictes. Ce référentiel définit les conditions de conformité pour les entrepôts de données de santé : (1) Base légale — l'article 9(2)(j) du RGPD permet le traitement de données de santé à des fins de recherche scientifique ou à des fins statistiques sous réserve de garanties appropriées ; en France, la loi relative à l'informatique, aux fichiers et aux libertés prévoit des régimes spécifiques pour les recherches, études et évaluations dans le domaine de la santé ; (2) Finalités — l'entrepôt doit avoir des finalités déterminées, explicites et légitimes ; les accès ultérieurs doivent être compatibles avec les finalités initiales ; (3) Gouvernance — un comité scientifique et éthique doit superviser les demandes d'accès aux données ; (4) Minimisation et pseudonymisation — les données doivent être pseudonymisées et les accès limités aux données strictement nécessaires ; (5) Sécurité — des mesures techniques et organisationnelles renforcées sont requises, notamment le chiffrement des données au repos et en transit, la traçabilité des accès, et la gestion des habilitations ; (6) Transferts — tout transfert de données de santé hors UE doit être encadré par des garanties appropriées.",
    topics: JSON.stringify(["health_data", "dpia", "transfers"]),
    language: "fr",
  },
  {
    reference: "CNIL-GUIDE-EMPLOI-2023",
    title: "Guide pratique — La protection des données dans les relations de travail",
    date: "2023-03-16",
    type: "guide",
    summary:
      "Guide de la CNIL sur le traitement des données personnelles des salariés. Couvre le recrutement, la gestion administrative, la surveillance, le contrôle de l'activité et la géolocalisation des salariés.",
    full_text:
      "Ce guide pratique accompagne les employeurs et les responsables RH dans leur mise en conformité au RGPD pour les traitements de données des salariés. Recrutement : les données collectées lors d'un recrutement doivent être limitées à celles nécessaires à l'évaluation des compétences du candidat ; les durées de conservation des candidatures non retenues sont limitées à 2 ans maximum. Gestion du personnel : les données des salariés peuvent être traitées sur la base de l'exécution du contrat de travail (art. 6(1)(b) RGPD) ou d'obligations légales (art. 6(1)(c) RGPD) ; le consentement du salarié n'est généralement pas une base légale appropriée en raison du déséquilibre de la relation employeur-employé. Surveillance et contrôle : la surveillance des salariés doit respecter le principe de proportionnalité ; les dispositifs de surveillance doivent être portés à la connaissance des salariés et, le cas échéant, soumis à consultation du comité social et économique (CSE) ; les keyloggers et les captures d'écran systématiques sont généralement considérés comme disproportionnés. Géolocalisation : la géolocalisation des véhicules ou téléphones professionnels est licite pour certaines finalités (sécurité, optimisation des tournées) mais ne doit pas permettre un contrôle permanent de l'activité des salariés ; la géolocalisation en dehors des heures de travail est interdite sauf circonstances exceptionnelles.",
    topics: JSON.stringify(["employee_monitoring", "consent"]),
    language: "fr",
  },
];

const insertGuideline = db.prepare(`
  INSERT INTO guidelines (reference, title, date, type, summary, full_text, topics, language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertGuidelinesAll = db.transaction(() => {
  for (const g of guidelines) {
    insertGuideline.run(
      g.reference,
      g.title,
      g.date,
      g.type,
      g.summary,
      g.full_text,
      g.topics,
      g.language,
    );
  }
});

insertGuidelinesAll();
console.log(`Inserted ${guidelines.length} guidelines`);

// --- Summary -----------------------------------------------------------------

const decisionCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions").get() as { cnt: number }
).cnt;
const guidelineCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines").get() as { cnt: number }
).cnt;
const topicCount = (
  db.prepare("SELECT count(*) as cnt FROM topics").get() as { cnt: number }
).cnt;
const decisionFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions_fts").get() as { cnt: number }
).cnt;
const guidelineFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines_fts").get() as { cnt: number }
).cnt;

console.log(`\nDatabase summary:`);
console.log(`  Topics:         ${topicCount}`);
console.log(`  Decisions:      ${decisionCount} (FTS entries: ${decisionFtsCount})`);
console.log(`  Guidelines:     ${guidelineCount} (FTS entries: ${guidelineFtsCount})`);
console.log(`\nDone. Database ready at ${DB_PATH}`);

db.close();
