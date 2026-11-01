import { db, productsTable, storeSettingsTable } from "@workspace/db";

const flavors = ["Queijo", "Carne", "Frango", "Pizza", "Presunto e queijo"];

const starterProducts = [
  { name: "Crepe de Queijo", description: "Crepe dourado com queijo derretido.", price: "14.90", imageUrl: "/products/crepe-queijo.jpg", category: "CREPES", unitCount: null, flavors: [], extras: [] },
  { name: "Crepe de Presunto e Queijo", description: "Combinação clássica de presunto e queijo.", price: "16.90", imageUrl: "/products/crepe-queijo.jpg", category: "CREPES", unitCount: null, flavors: [], extras: [] },
  { name: "Crepe de Frango com Queijo", description: "Frango temperado com queijo derretido.", price: "17.90", imageUrl: "/products/crepe-queijo.jpg", category: "CREPES", unitCount: null, flavors: [], extras: [] },
  { name: "Crepe de Frango com Catupiry", description: "Frango cremoso com catupiry.", price: "19.90", imageUrl: "/products/crepe-queijo.jpg", category: "CREPES", unitCount: null, flavors: [], extras: [] },
  { name: "Crepe de Chocolate", description: "Crepe macio com recheio de chocolate.", price: "15.90", imageUrl: "/products/crepe-queijo.jpg", category: "CREPES", unitCount: null, flavors: [], extras: [] },
  { name: "Combo de Mini Pastéis · 6 unidades", description: "Escolha os sabores para montar seu combo.", price: "22.90", imageUrl: "/products/mini-pasteis.jpg", category: "MINI_PASTEIS_6", unitCount: 6, flavors, extras: [] },
  { name: "Combo de Mini Pastéis · 12 unidades", description: "Monte seu combo com até cinco sabores.", price: "39.90", imageUrl: "/products/mini-pasteis.jpg", category: "MINI_PASTEIS_12", unitCount: 12, flavors, extras: [] },
  { name: "Batata frita pequena simples", description: "Porção pequena, crocante e dourada.", price: "12.90", imageUrl: "/products/batata-simples.jpg", category: "BATATA", unitCount: null, flavors: [], extras: [{ name: "Cheddar", price: 3 }, { name: "Bacon", price: 4 }, { name: "Catupiry", price: 4 }] },
  { name: "Batata frita pequena completa", description: "Porção pequena com cheddar e bacon.", price: "18.90", imageUrl: "/products/batata-completa.jpg", category: "BATATA", unitCount: null, flavors: [], extras: [{ name: "Cheddar extra", price: 3 }, { name: "Bacon extra", price: 4 }, { name: "Catupiry", price: 4 }] },
  { name: "Batata frita grande simples", description: "Porção grande, crocante e dourada.", price: "19.90", imageUrl: "/products/batata-simples.jpg", category: "BATATA", unitCount: null, flavors: [], extras: [{ name: "Cheddar", price: 4 }, { name: "Bacon", price: 5 }, { name: "Catupiry", price: 5 }] },
  { name: "Batata frita grande completa", description: "Porção grande com cheddar e bacon.", price: "29.90", imageUrl: "/products/batata-completa.jpg", category: "BATATA", unitCount: null, flavors: [], extras: [{ name: "Cheddar extra", price: 4 }, { name: "Bacon extra", price: 5 }, { name: "Catupiry", price: 5 }] },
];

export async function seedStoreIfNeeded(): Promise<void> {
  await db.transaction(async (tx) => {
    const [createdSettings] = await tx
      .insert(storeSettingsTable)
      .values({
        id: 1,
        name: "Lanche da Casa",
        tagline: "Seu lanche favorito, feito na hora.",
        logoUrl: null,
        whatsappNumber: "",
        deliveryFee: "0",
      })
      .onConflictDoNothing()
      .returning({ id: storeSettingsTable.id });

    if (!createdSettings) return;
    await tx.insert(productsTable).values(starterProducts);
  });
}
