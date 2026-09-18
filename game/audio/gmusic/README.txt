G-Music - radioplaylist

Zet hier de AI-gegenereerde nummers neer (.mp3 of .ogg), en noem hun
bestandsnamen in manifest.json onder "tracks", bijvoorbeeld:

{
  "tracks": ["nummer1.mp3", "nummer2.mp3"]
}

De volgorde in die lijst is de afspeelvolgorde; de hele playlist herhaalt
zichzelf zodra het laatste nummer is afgelopen. Leeg laten ("tracks": [])
betekent: G-Music blijft stil tot er nummers zijn toegevoegd.
