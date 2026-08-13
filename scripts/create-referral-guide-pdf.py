from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "GUIDE_INTERMEDIATION_WORKCRUTE.pdf"
NAVY, BLUE, LIGHT, INK, MUTED, GREEN = colors.HexColor("#10233F"), colors.HexColor("#2563EB"), colors.HexColor("#F2F6FC"), colors.HexColor("#142033"), colors.HexColor("#64748B"), colors.HexColor("#078A68")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=32, textColor=colors.white, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontSize=12, leading=18, textColor=colors.HexColor("#DCE8FA"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=25, textColor=NAVY, spaceBefore=4, spaceAfter=12))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontSize=9.5, leading=14, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontSize=8, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontSize=10, leading=15, textColor=NAVY, leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=8))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#DCE5F1")); canvas.line(18*mm, 14*mm, 192*mm, 14*mm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 9*mm, "Workcrute — Guide client — Intermédiation candidats")
    canvas.drawRightString(192*mm, 9*mm, f"Page {doc.page}")
    canvas.restoreState()

def p(text, style="Bodyx"): return Paragraph(text, styles[style])
def bullets(items): return [p(f"• {item}") for item in items]
def step(number, title, body):
    badge=Table([[p(str(number),"CoverSub")]],colWidths=[10*mm],rowHeights=[10*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,-1),BLUE),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    return KeepTogether([Table([[badge,p(f"<b>{title}</b><br/>{body}")]],colWidths=[14*mm,151*mm],style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("BOTTOMPADDING",(0,0),(-1,-1),7)]))])

story=[]
cover=Table([[p("WORKCRUTE","CoverTitle")],[p("Guide client — Transmission sécurisée des profils candidats","CoverSub")],[Spacer(1,12*mm)],[p("Administrateur → Recruteur","CoverTitle")],[p("Une intermédiation contrôlée, traçable et respectueuse des données candidats.","CoverSub")]],colWidths=[174*mm],rowHeights=[30*mm,18*mm,22*mm,25*mm,40*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BOX",(0,0),(-1,-1),0,NAVY)]))
story += [Spacer(1,32*mm),cover,Spacer(1,16*mm),p("Document de livraison — version 14 août 2026","Smallx"),PageBreak()]

story += [p("1. Le principe","H1x"),p("Workcrute reste l’intermédiaire entre les candidats et les recruteurs. Un compte recruteur conserve ses offres, questionnaires, entretiens, notifications et paramètres, mais il ne parcourt plus librement la base globale des candidats."),Table([[p("RÈGLE PAR DÉFAUT","H2x"),p("Un recruteur voit uniquement les profils que l’administration Workcrute lui a explicitement transmis.","Callout")]],colWidths=[42*mm,123*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,-1),LIGHT),("BOX",(0,0),(-1,-1),.7,BLUE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("PADDING",(0,0),(-1,-1),8)])),p("Ce contrôle s’applique aussi aux appels API et aux téléchargements. Modifier une adresse ou un identifiant ne donne aucun accès supplémentaire : le serveur répond par un refus 403."),p("Ce que cela change","H2x")]
story += bullets(["Les candidatures directes restent visibles par l’administration.","Le recruteur n’est alerté qu’après une transmission admin.","Chaque document partagé est choisi individuellement.","Le statut, la consultation et les actions sont historisés.","L’accès global futur existe comme paramètre administrable, désactivé par défaut."])
story += [PageBreak(),p("2. Envoyer un profil","H1x"),p("Depuis le Control Center, ouvrez <b>Candidats</b>, <b>Candidatures</b> ou <b>Transmissions</b>. L’action <b>Envoyer au recruteur</b> ouvre le parcours sécurisé."),step(1,"Choisir les candidats","Sélectionnez un ou plusieurs profils. Vérifiez l’identité, le métier, la ville et la disponibilité."),step(2,"Choisir le recruteur","Sélectionnez le destinataire actif et contrôlez l’entreprise affichée."),step(3,"Associer une offre","L’offre est facultative. Lorsqu’elle est choisie, elle doit appartenir au recruteur destinataire."),step(4,"Choisir les documents","Cochez uniquement le CV, la lettre, le diplôme, le certificat ou le portfolio utile. Un document non coché reste inaccessible."),step(5,"Ajouter un message","Rédigez un contexte court, professionnel et sans donnée sensible inutile."),step(6,"Vérifier et confirmer","Relisez le récapitulatif avant l’envoi. Une notification est créée immédiatement et l’email suit si les préférences du recruteur l’autorisent."),p("Doublons","H2x"),p("Si le même candidat a déjà été transmis au même recruteur pour la même offre, Workcrute affiche la date de la transmission existante. Le renvoi n’est possible qu’après une confirmation explicite.")]
story += [PageBreak(),p("3. Ce que reçoit le recruteur","H1x"),p("La navigation recruteur affiche désormais <b>Profils reçus</b> (FR), <b>Received profiles</b> (EN) et sa version arabe (AR). Chaque carte indique le candidat, l’offre éventuelle, la date d’envoi et le statut."),p("Actions disponibles","H2x")]
story += bullets(["Consulter les informations professionnelles transmises.","Télécharger uniquement les documents autorisés.","Contacter le candidat.","Ajouter une note interne invisible du candidat.","Présélectionner, accepter ou refuser le profil.","Planifier un entretien présentiel, téléphonique ou en visio."])
status_data=[[p("Statut","H2x"),p("Signification","H2x")]]+[[p(a),p(b)] for a,b in [("TRANSMITTED","Profil envoyé, pas encore consulté."),("VIEWED","Profil ouvert par le recruteur."),("SHORTLISTED","Profil présélectionné."),("INTERVIEW","Entretien planifié ou étape entretien."),("ACCEPTED","Profil accepté."),("REJECTED","Profil refusé.")]]
story += [Table(status_data,colWidths=[45*mm,120*mm],repeatRows=1,style=TableStyle([("BACKGROUND",(0,0),(-1,0),LIGHT),("GRID",(0,0),(-1,-1),.4,colors.HexColor("#DCE5F1")),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),6)])),PageBreak()]

story += [p("4. Suivre et administrer","H1x"),p("La page <b>Transmissions</b> présente l’historique central : candidat, recruteur, entreprise, offre, statut et date. Le tableau de bord ajoute les volumes totaux et du jour."),p("Contrôles et audit","H2x")]
story += bullets(["Création d’une transmission journalisée dans l’audit admin.","Passage automatique à VIEWED lors de la première ouverture.","Chaque changement de statut ajouté à l’historique.","Notes recruteur isolées et jamais exposées au candidat.","Emails placés dans une file avec plusieurs tentatives en cas d’échec.","Matching uniquement déterministe ; aucun score aléatoire n’est affiché."])
story += [p("Paramètre d’accès recruteur","H2x"),p("Dans <b>Admin > Paramètres</b>, l’option d’accès à la base globale existe pour une évolution future. Elle est livrée <b>désactivée</b>. Ne l’activez qu’après validation métier, juridique et sécurité."),p("Bonnes pratiques","H2x")]
story += bullets(["Ne transmettre que les documents nécessaires à l’évaluation.","Éviter les informations sensibles dans le message libre.","Contrôler l’entreprise et l’offre avant confirmation.","Consulter l’historique avant de forcer un doublon.","Utiliser Suspendre pour couper immédiatement l’accès d’un compte recruteur."])
story += [PageBreak(),p("5. Validation et assistance","H1x"),p("La livraison a été validée par des tests automatisés couvrant le flux complet et les tentatives d’accès interdites."),p("Scénarios vérifiés","H2x")]
story += bullets(["Candidature directe invisible avant transmission.","Apparition dans Profils reçus et dans le pipeline après transmission.","Refus 403 pour un autre recruteur ou un identifiant manipulé.","Documents limités à la liste autorisée.","Consultation, changement de statut, note interne et entretien.","Détection du doublon et renvoi forcé explicite.","Audit admin, notification et file email.","Non-régression admin, questionnaires, chatbot, emails, erreurs et paramètres."])
story += [Spacer(1,8*mm),Table([[p("Besoin d’aide ?","H2x"),p("Utilisez l’adresse de support configurée dans Admin > Paramètres > Général. Ne communiquez jamais les secrets administrateur dans une demande d’assistance.")]],colWidths=[42*mm,123*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,-1),LIGHT),("BOX",(0,0),(-1,-1),.7,GREEN),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),8)]))]

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=18*mm,bottomMargin=20*mm,title="Guide client Workcrute — Intermédiation candidats",author="Workcrute")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
