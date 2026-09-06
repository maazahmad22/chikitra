# Avatars

This demo does not ship photo avatars.

Every person (patient, doctor, staff member) is drawn as a coloured **initials
badge** generated in code — see `Components.avatar()` in
`assets/js/components.js` and `Utils.tint()` in `assets/js/data.js`.

The colour is derived from the person's name, so the same person always gets
the same tint everywhere in the app, with no image files to manage and nothing
to load over the network.

If you want real photos instead, drop image files in this folder and change
`Components.avatar()` to render an `<img>` when a patient record has a
`photo` property.
