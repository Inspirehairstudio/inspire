/* =========================================================
   Shop + team data.
   Edit here today. Later the admin portal (Supabase) will
   supply this same shape, and this file becomes the fallback.
   ========================================================= */
window.INSPIRE = {
  shop: {
    name: "Inspire Hair Studio",
    phone: "(903) 818-7138",
    phoneHref: "tel:+19038187138",
    email: "inspirestudioscommunications@gmail.com",
    street: "201 Sunset Blvd",
    cityLine: "Sherman, TX 75092",
    hours: "Mon – Sat, 9 AM – 7 PM",
    hoursNote: "Closed Sunday",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=201+Sunset+Blvd+Sherman+TX+75092",
    reviewUrl: "https://g.page/r/CdBo2ewRmGkQEAE/review",
    socials: {
      instagram: "https://www.instagram.com/inspirehairstudio__/",
      facebook: "https://www.facebook.com/inspirehairstudios",
      tiktok: "" // add the TikTok profile URL here and the icon appears everywhere
    }
  },

  team: [
    {
      id: "fernando",
      name: "Fernando J.",
      first: "Fernando",
      role: "Barber",
      kind: "barber",
      owner: true,
      photo: "images2/web/inspirehairstudiosfernando.jpg",
      thumb: "images2/web/inspirehairstudiosfernando-sm.jpg",
      short: "Owner · Precision cuts",
      bio: "Fernando leads Inspire Hair Studio with a focus on consistency, sharp finishing, and a polished client experience from start to finish.",
      tags: ["Precision cuts", "Beard work", "Modern barbering"],
      app: "Squire",
      bookUrl: "https://getsquire.com/booking/book/fernandoughfades-sherman/barber/fernando-jimenez-1/services?utm_source=site&utm_medium=book_button&utm_campaign=fernando",
      services: [
        { name: "Haircut", price: "$75", time: "1 hr" },
        { name: "Haircut & Beard", price: "$100", time: "1 hr 30 min" }
      ],
      photos: [
        "images2/web/inspirehairstudiofernandoholdingclippers.jpg",
        "images2/web/inspirehairstudiofernandogettinghaircut.jpg"
      ]
    },
    {
      id: "marv",
      name: "Marv",
      first: "Marv",
      role: "Barber",
      kind: "barber",
      photo: "images2/web/inspirehairstudiosmarv.jpg",
      thumb: "images2/web/inspirehairstudiosmarv-sm.jpg",
      short: "Barber · Blends & beards",
      bio: "Marv brings a clean, detail-driven approach focused on sharp cuts, beard work, and a polished finish.",
      tags: ["Blends", "Beard work", "Barbershop detail"],
      app: "Booksy",
      bookUrl: "https://booksy.com/en-us/instant-experiences/widget/1726685?instant_experiences_enabled=true&ig_ix=true",
      services: [
        { name: "Haircut", price: "$60", time: "1 hr" },
        { name: "Haircut & Beard", price: "$75", time: "1 hr" },
        { name: "Kid’s Haircut", price: "$30", time: "30 min" },
        { name: "Full Service", price: "$120", time: "1 hr" }
      ],
      photos: ["images2/web/inspirehairstudiomarvusingclippers.jpg"]
    },
    {
      id: "danielle",
      name: "Danielle",
      first: "Danielle",
      role: "Stylist",
      kind: "stylist",
      photo: "images2/web/inspirehairstudiosdanielle.jpg",
      thumb: "images2/web/inspirehairstudiosdanielle-sm.jpg",
      short: "Stylist · Color & cuts",
      bio: "Danielle offers a broad salon menu with haircuts, styling, color services, highlights, and specialty appointments.",
      tags: ["Color", "Highlights", "Cuts & styling"],
      app: "Vagaro",
      bookUrl: "https://www.vagaro.com/mizzicasalon?utm_source=ig&utm_medium=social&utm_content=link_in_bio",
      services: [
        { name: "Men’s Signature Haircut", price: "$46", note: "Includes shampoo & hot towel" },
        { name: "Women’s Cut & Style", price: "$64+", note: "Shampoo, cut & blow dry" },
        { name: "Kid’s Haircut 10 & Under", price: "$30+", note: "Children 10 and under" },
        { name: "All Over Color", price: "$109+", note: "Color service" },
        { name: "Color Retouch", price: "$99+", note: "Root maintenance" },
        { name: "Accent Highlight", price: "$114+", note: "Face-framing / pop of blonde" },
        { name: "Partial Highlight", price: "$129+", note: "Focused highlight service" },
        { name: "Full Highlight", price: "$174+", note: "Full foil service" }
      ],
      photos: ["images2/web/inspirehairstudiodanielleholdingscissors.jpg"]
    }
  ]
};
