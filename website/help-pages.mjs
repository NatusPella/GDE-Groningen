// Hulp- en uitlegpagina's voor de marketingpagina (#37). Eén bron voor de inhoud; build.mjs
// zet ze met de gedeelde header/footer in website/_site/help/. Alles Nederlands, 18+,
// geen externe laadbronnen (de linkjes naar GitHub/YouTube openen pas na een klik).
export const HELP_PAGES = [
  {
    slug: 'index',
    titel: 'Hulp en veelgestelde vragen',
    beschrijving: 'Hulp bij GDE Groningen: installeren, spelen, samen spelen en problemen melden.',
    intro: 'Iets kwijt of iets stuk? Hieronder staan de antwoorden op de meestgestelde vragen. Kom je er niet uit, open dan een issue op GitHub; dan kijken we mee.',
    body: `
      <div class="help-grid">
        <a class="help-card" href="installeren.html"><strong>Installeren</strong><span>Windows, macOS, Linux en Android, en wat je doet bij de waarschuwing van je systeem.</span></a>
        <a class="help-card" href="spelen.html"><strong>Spelen en besturing</strong><span>Toetsen, controller, opslaan, instellingen en toegankelijkheid.</span></a>
        <a class="help-card" href="samen-spelen.html"><strong>Samen spelen</strong><span>Een kamercode, toestemming, eigen voortgang en wat er met je IP-adres gebeurt.</span></a>
        <a class="help-card" href="problemen.html"><strong>Problemen en fouten melden</strong><span>Crash, geen geluid, haperingen of een vastloper: dit kun je zelf proberen.</span></a>
      </div>
      <h2>Snelle antwoorden</h2>
      <ul>
        <li><strong>Wat kost het?</strong> Niets. Geen advertenties, geen account, geen aankopen.</li>
        <li><strong>Hoe oud moet ik zijn?</strong> Het spel is bedoeld voor spelers van 18 jaar en ouder.</li>
        <li><strong>Is het spel af?</strong> Nee, dit is een openbare playtest. Elke versie is een pre-release; ruwe randen horen erbij.</li>
        <li><strong>Waar zijn de downloads?</strong> Bij de <a href="https://github.com/NatusPella/GDE-Groningen/releases">releases op GitHub</a>.</li>
        <li><strong>Is er een online versie?</strong> Nog niet. De marketingpagina is er wel, maar de speelbare webversie volgt later.</li>
      </ul>
      <h2>Nog steeds vast?</h2>
      <p>Open een issue op <a href="https://github.com/NatusPella/GDE-Groningen/issues">GitHub</a> met je versie, platform en wat je deed. Een foutrapport uit het spel helpt enorm; dat staat onder <strong>Over › Problemen</strong> in het pauzemenu.</p>
      <p class="help-terug"><a href="../">← Terug naar de marketingpagina</a></p>
    `,
  },
  {
    slug: 'installeren',
    titel: 'Installeren',
    beschrijving: 'GDE Groningen installeren op Windows, macOS, Linux en Android, inclusief de waarschuwing voor niet-ondertekende builds.',
    intro: 'De builds zijn gratis pre-releases en niet ondertekend. Daarom waarschuwt je systeem de eerste keer. Hieronder staat per platform wat je doet.',
    body: `
      <p>Pak de nieuwste pre-release bij de <a href="https://github.com/NatusPella/GDE-Groningen/releases/latest">releases</a>. Elke release is een pre-release van de openbare playtest; kijk in de release zelf welke bestanden erbij zitten.</p>
      <h2>Windows</h2>
      <ol>
        <li>Download <code>GDE-Groningen-&lt;versie&gt;-windows-portable.exe</code>.</li>
        <li>Dubbelklik; installeren is niet nodig.</li>
        <li>Zegt Windows "Windows heeft uw pc beveiligd"? Klik op <strong>Meer info</strong> en dan op <strong>Toch uitvoeren</strong>. Dat komt doordat de app niet ondertekend is.</li>
      </ol>
      <h2>macOS</h2>
      <ol>
        <li>Download <code>GDE-Groningen-&lt;versie&gt;-mac.dmg</code> en open hem.</li>
        <li>Sleep GDE Groningen naar <strong>Programma's</strong> en start de app.</li>
        <li>Bij de melding klik je <strong>Gereed</strong>. Ga daarna naar <strong>Systeeminstellingen › Privacy en beveiliging</strong> en klik onderaan op <strong>Open toch</strong>.</li>
      </ol>
      <h2>Linux en Steam Deck</h2>
      <ol>
        <li>Download de <code>.AppImage</code> of de <code>.tar.gz</code>.</li>
        <li>Maak de AppImage uitvoerbaar (<code>chmod +x GDE-Groningen-*.AppImage</code>) en start hem. Of pak de tar uit en start <code>gde-groningen</code>.</li>
        <li>Op de Steam Deck: download in de bureaubladmodus en voeg de app toe met <strong>Aan Steam toevoegen</strong>.</li>
      </ol>
      <h2>Android (debug-APK)</h2>
      <p>Download <code>GDE-Groningen-&lt;versie&gt;-android-debug.apk</code> en installeer hem. Omdat dit een debug-build is, moet je op je toestel installatie uit onbekende bronnen toestaan. Alleen bedoeld om te proberen, niet voor dagelijks gebruik.</p>
      <h2>Vanaf de broncode</h2>
      <p>Dat kan ook: zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/ONTWIKKELEN.md">docs/ONTWIKKELEN.md</a> in de repo. De kaarttegels staan niet in git; een verse kloon heeft de wereld uit een release nodig.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'spelen',
    titel: 'Spelen en besturing',
    beschrijving: 'Besturing, controller, opslaan, instellingen en toegankelijkheid van GDE Groningen.',
    intro: 'Dit is een open-wereldgame in het echte Groningen. Hieronder staat hoe je loopt, rijdt, vaart en vliegt, en hoe je je voortgang bewaart.',
    body: `
      <h2>Toetsen</h2>
      <table>
        <thead><tr><th>Toets</th><th>Lopend</th><th>In een voertuig</th></tr></thead>
        <tbody>
          <tr><td>W A S D of pijltjes</td><td>lopen (Shift: rennen)</td><td>gas, achteruit, sturen</td></tr>
          <tr><td>Spatie</td><td>springen</td><td>remmen</td></tr>
          <tr><td>Ctrl (browser: C)</td><td>bukken</td><td></td></tr>
          <tr><td>E of F</td><td>instappen, winkel of klus gebruiken</td><td>uitstappen</td></tr>
          <tr><td>Muis</td><td>camera draaien</td><td>camera draaien</td></tr>
          <tr><td>Linkermuisknop</td><td>aanvallen of schieten</td><td>uit het raam schieten</td></tr>
          <tr><td>Rechtermuisknop</td><td>richten</td><td></td></tr>
          <tr><td>1 – 4, muiswiel</td><td>wapen kiezen</td><td></td></tr>
          <tr><td>H / L / Q</td><td></td><td>toeter / lichten en sirene / achterom kijken</td></tr>
          <tr><td>M</td><td>kaart (klik: route zetten)</td><td>kaart</td></tr>
          <tr><td>Esc</td><td>menu met telefoon, spullen en instellingen</td><td></td></tr>
        </tbody>
      </table>
      <p>Een controller (Xbox, PlayStation, Steam Deck) werkt ook, in het spel en in de menu's. Toetsen en knoppen pas je aan onder <strong>Instellingen › Besturing</strong>.</p>
      <h2>Opslaan</h2>
      <p>Het spel slaat vanzelf op, en met <strong>Opslaan</strong> in het pauzemenu. Je save staat op je eigen apparaat. Vóór 1.0 kan een savegame bij een nieuwe versie nog breken; bewaar je oude saves als je een nieuwe versie probeert.</p>
      <h2>Toegankelijkheid</h2>
      <p>Onder <strong>Instellingen › Toegankelijkheid</strong> vind je kleurenblindmodi, de grootte van de interface en "Beweging beperken". De grootte van de ondertitels staat onder <strong>Geluid &amp; ondertitels</strong>.</p>
      <h2>Privacy</h2>
      <p>Er is geen account, geen tracking en geen statistiek. De desktopapp speelt offline, met twee uitzonderingen die je zelf aan- of uitzet: Samen spelen en de live busposities. Zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/PRIVACY-EN-CREDITS.md">docs/PRIVACY-EN-CREDITS.md</a>.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'samen-spelen',
    titel: 'Samen spelen',
    beschrijving: 'Samen spelen in GDE Groningen: kamercode, toestemming, eigen voortgang en privacy.',
    intro: 'Samen spelen kan met een kamercode. Geen account, geen server van ons: je verbindt rechtstreeks met je medespeler. Hieronder staat hoe het werkt en wat je van je verbinding kunt verwachten.',
    body: `
      <h2>Zo werkt het</h2>
      <ol>
        <li>Open in het pauzemenu de optie <strong>Samen spelen</strong> en kies dat je een sessie opent.</li>
        <li>Je krijgt een kamercode. Geef die aan je vriend of vriendin.</li>
        <li>Diegene start het spel, kiest <strong>Meedoen</strong> en vult de code in.</li>
        <li>Je krijgt een melding en kiest zelf of je meedoet. Zonder toestemming gebeurt er niets.</li>
      </ol>
      <h2>Wat je deelt en wat je houdt</h2>
      <ul>
        <li>Iedere speler houdt eigen geld, eigen voortgang en eigen bezit; speel je later alleen, dan staat je eigen spel er nog.</li>
        <li>De host kan spelers verwijderen; de host kan ook wisselen. Verder is iedereen gelijk: tijd, reizen en pauzeren zijn gezamenlijke keuzes.</li>
        <li>Spelers kunnen elkaar alleen bestrijden (PvP) als beiden niet op passive mode staan. Dood door een medespeler kost je geen geld of voortgang.</li>
      </ul>
      <h2>Privacy en verbinding</h2>
      <p>Na jouw toestemming gaat je IP-adres naar een openbare STUN-server en lopen de versleutelde signaleringsberichten via openbare brokers. Zonder toestemming verstuurt het spel niets. Er is geen tekstchat en geen spraak; alleen de verbinding en het spel. Zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/PRIVACY-EN-CREDITS.md">docs/PRIVACY-EN-CREDITS.md</a> voor de details.</p>
      <p>Werkt de verbinding niet? Controleer je firewall en of jullie dezelfde versie spelen. De firewall van Windows kan de eerste keer om toestemming vragen.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'problemen',
    titel: 'Problemen en fouten melden',
    beschrijving: 'Wat je kunt doen bij een crash, geen geluid, haperingen of een fout in GDE Groningen, en hoe je een issue meldt.',
    intro: 'Loopt het spel vast, hoor je niets of ziet het er niet uit? Probeer eerst deze stappen. Kom je er niet uit, meld het dan; daar wordt het spel beter van.',
    body: `
      <h2>Eerst proberen</h2>
      <ul>
        <li><strong>Start het spel opnieuw</strong> en controleer of je de nieuwste release gebruikt.</li>
        <li><strong>Grafische instellingen</strong>: zet de kwaliteit lager (Instellingen › Beeld) of zet hardwareversnelling aan in je browser.</li>
        <li><strong>Geen geluid?</strong> Controleer de volumemixer van je systeem en of het juiste audioapparaat gekozen is.</li>
        <li><strong>Haperingen?</strong> Sluit andere zware programma's en probeer de voorinstelling Gemiddeld of Laag.</li>
        <li><strong>Besturing?</strong> Sluit je controller opnieuw aan of kies een andere controllerindeling onder Instellingen › Besturing.</li>
      </ul>
      <h2>Foutrapport</h2>
      <p>In het pauzemenu staat onder <strong>Over › Problemen</strong> het foutrapport met <strong>Kopieer het rapport</strong>. Dat logboek blijft op je eigen apparaat; het wordt nergens naartoe gestuurd. Plak het in je issue, dan is de oorzaak vaak sneller te vinden.</p>
      <h2>Een issue melden</h2>
      <p>Open een issue op <a href="https://github.com/NatusPella/GDE-Groningen/issues">GitHub</a> en noem:</p>
      <ul>
        <li>de versie (staat op het startscherm en in de releasenaam);</li>
        <li>je platform (Windows, macOS, Linux/Steam Deck, Android of browser);</li>
        <li>wat je deed toen het misging, en wat je verwachtte;</li>
        <li>het foutrapport uit <strong>Over › Problemen</strong>.</li>
      </ul>
      <p>Geen echte namen of persoonsgegevens in issues, screenshots of opnamen, graag. Gebruik een tester-nummer of een beschrijving van de plek.</p>
      <h2>Bekende eigenaardigheden</h2>
      <ul>
        <li><strong>Waarschuwing bij de eerste start</strong>: de builds zijn niet ondertekend. Zie <a href="installeren.html">Installeren</a>.</li>
        <li><strong>Geen online versie</strong>: er is nog geen webversie; speel de download of draai het spel vanaf de broncode.</li>
        <li><strong>Xbox/PlayStation-controller</strong>: werkt in het spel en in de menu's; niet elk spelletje heeft al een aangepaste knopindeling.</li>
      </ul>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
];

