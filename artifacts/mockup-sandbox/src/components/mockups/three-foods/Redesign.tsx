import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

type Category = 'CREPES' | 'MINI_PASTEIS_6' | 'MINI_PASTEIS_12' | 'BATATA';
type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  active: boolean;
  unitCount: number | null;
  flavors: string[];
  extras: { name: string; price: number }[];
};
type FlavorLine = { name: string; quantity: number };
type CartLine = {
  product: Product;
  quantity: number;
  flavors: FlavorLine[];
  extras: string[];
  notes: string;
};
type Customer = {
  customerName: string;
  phone: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  address: string;
  reference: string;
  notes: string;
  paymentMethod: 'CASH' | 'PIX' | 'CARD';
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const categoryName: Record<Category, string> = {
  CREPES: 'Crepes',
  MINI_PASTEIS_6: 'Pastéis · 6 un.',
  MINI_PASTEIS_12: 'Pastéis · 12 un.',
  BATATA: 'Batatas',
};
const comboFlavors = ['Queijo', 'Carne', 'Frango', 'Pizza', 'Presunto e queijo'];
const categories: { key: 'ALL' | Category; label: string; number: string }[] = [
  { key: 'ALL', label: 'Tudo', number: '01' },
  { key: 'CREPES', label: 'Crepes', number: '02' },
  { key: 'MINI_PASTEIS_6', label: 'Pastéis · 6 un.', number: '03' },
  { key: 'MINI_PASTEIS_12', label: 'Pastéis · 12 un.', number: '04' },
  { key: 'BATATA', label: 'Batatas', number: '05' },
];
const products: Product[] = [
  { id: 1, name: 'Crepe de Queijo', description: 'Crepe dourado com queijo derretido.', price: 14.9, imageUrl: '/__mockup/images/crepe-queijo.jpg', category: 'CREPES', active: true, unitCount: null, flavors: [], extras: [] },
  { id: 2, name: 'Crepe de Presunto e Queijo', description: 'Combinação clássica de presunto e queijo.', price: 16.9, imageUrl: '/__mockup/images/crepe-queijo.jpg', category: 'CREPES', active: true, unitCount: null, flavors: [], extras: [] },
  { id: 3, name: 'Crepe de Frango com Queijo', description: 'Frango temperado com queijo derretido.', price: 17.9, imageUrl: '/__mockup/images/crepe-queijo.jpg', category: 'CREPES', active: true, unitCount: null, flavors: [], extras: [] },
  { id: 4, name: 'Crepe de Frango com Catupiry', description: 'Frango cremoso com catupiry.', price: 19.9, imageUrl: '/__mockup/images/crepe-queijo.jpg', category: 'CREPES', active: true, unitCount: null, flavors: [], extras: [] },
  { id: 5, name: 'Crepe de Chocolate', description: 'Crepe macio com recheio de chocolate.', price: 15.9, imageUrl: '/__mockup/images/crepe-queijo.jpg', category: 'CREPES', active: true, unitCount: null, flavors: [], extras: [] },
  { id: 6, name: 'Combo de Mini Pastéis · 6 unidades', description: 'Escolha os sabores para montar seu combo.', price: 22.9, imageUrl: '/__mockup/images/mini-pasteis.jpg', category: 'MINI_PASTEIS_6', active: true, unitCount: 6, flavors: comboFlavors, extras: [] },
  { id: 7, name: 'Combo de Mini Pastéis · 12 unidades', description: 'Monte seu combo com até cinco sabores.', price: 39.9, imageUrl: '/__mockup/images/mini-pasteis.jpg', category: 'MINI_PASTEIS_12', active: true, unitCount: 12, flavors: comboFlavors, extras: [] },
  { id: 8, name: 'Batata frita pequena simples', description: 'Porção pequena, crocante e dourada.', price: 12.9, imageUrl: '/__mockup/images/batata-simples.jpg', category: 'BATATA', active: true, unitCount: null, flavors: [], extras: [{ name: 'Cheddar', price: 3 }, { name: 'Bacon', price: 4 }, { name: 'Catupiry', price: 4 }] },
  { id: 9, name: 'Batata frita pequena completa', description: 'Porção pequena com cheddar e bacon.', price: 18.9, imageUrl: '/__mockup/images/batata-completa.jpg', category: 'BATATA', active: true, unitCount: null, flavors: [], extras: [{ name: 'Cheddar extra', price: 3 }, { name: 'Bacon extra', price: 4 }, { name: 'Catupiry', price: 4 }] },
  { id: 10, name: 'Batata frita grande simples', description: 'Porção grande, crocante e dourada.', price: 19.9, imageUrl: '/__mockup/images/batata-simples.jpg', category: 'BATATA', active: true, unitCount: null, flavors: [], extras: [{ name: 'Cheddar', price: 4 }, { name: 'Bacon', price: 5 }, { name: 'Catupiry', price: 5 }] },
  { id: 11, name: 'Batata frita grande completa', description: 'Porção grande com cheddar e bacon.', price: 29.9, imageUrl: '/__mockup/images/batata-completa.jpg', category: 'BATATA', active: true, unitCount: null, flavors: [], extras: [{ name: 'Cheddar extra', price: 4 }, { name: 'Bacon extra', price: 5 }, { name: 'Catupiry', price: 5 }] },
];

const css = `
  .tf-page {
    --tf-ink: #1d3025;
    --tf-green: #254631;
    --tf-green-deep: #183723;
    --tf-cream: #f5f0df;
    --tf-paper: #fffdf5;
    --tf-orange: #e2522c;
    --tf-yellow: #f2c34e;
    --tf-muted: #6f7869;
    --tf-line: #dcd6c4;
    min-height: 100dvh;
    overflow: hidden;
    color: var(--tf-ink);
    background: var(--tf-cream);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .tf-page * { box-sizing: border-box; }
  .tf-page button, .tf-page input, .tf-page textarea, .tf-page select { font: inherit; }
  .tf-page button { cursor: pointer; }
  .tf-wrap { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
  .tf-top {
    height: 82px; display:flex; align-items:center; justify-content:space-between;
    border-bottom: 1px solid rgba(29,48,37,.16);
  }
  .tf-brand { display:flex; align-items:center; gap:12px; color:var(--tf-ink); text-decoration:none; }
  .tf-mark {
    width:45px; height:45px; display:grid; place-items:center; background:var(--tf-orange); color:#fff7df;
    border-radius:14px 14px 14px 4px; font-weight:1000; font-size:20px; letter-spacing:-.1em; padding-right:3px;
    box-shadow: 4px 4px 0 var(--tf-yellow); transform:rotate(-3deg);
  }
  .tf-brand-name { font-size:20px; font-weight:950; letter-spacing:-.055em; line-height:1; }
  .tf-brand-sub { margin-top:5px; color:var(--tf-muted); font-size:10px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
  .tf-top-meta { display:flex; align-items:center; gap:23px; font-size:12px; font-weight:750; }
  .tf-open { display:flex; align-items:center; gap:7px; color:var(--tf-green); }
  .tf-dot { width:8px; height:8px; border-radius:50%; background:#5e9a60; box-shadow:0 0 0 4px #5e9a6020; }
  .tf-location { color:var(--tf-muted); }
  .tf-hero {
    position:relative; display:grid; grid-template-columns: .9fr 1.1fr; gap:42px; align-items:center;
    min-height:440px; padding:43px 0 49px;
  }
  .tf-hero-copy { position:relative; z-index:1; padding:12px 0 10px 6px; }
  .tf-kicker {
    display:inline-flex; align-items:center; gap:9px; color:var(--tf-orange); font-size:11px;
    letter-spacing:.15em; font-weight:950; text-transform:uppercase;
  }
  .tf-kicker:before { content:""; width:23px; height:3px; background:var(--tf-orange); }
  .tf-hero h1 {
    max-width:480px; margin:20px 0 18px; font-family:Georgia, "Times New Roman", serif;
    font-size:clamp(53px, 6.2vw, 82px); line-height:.92; font-weight:900; letter-spacing:-.075em;
  }
  .tf-hero h1 em { color:var(--tf-orange); font-weight:900; }
  .tf-hero-copy p { max-width:380px; margin:0; font-size:16px; line-height:1.6; color:#586458; }
  .tf-hero-cta { display:flex; align-items:center; gap:18px; margin-top:26px; }
  .tf-primary {
    display:inline-flex; align-items:center; justify-content:center; gap:12px; border:0; border-radius:6px;
    min-height:50px; padding:0 21px; background:var(--tf-orange); color:#fff9ea; font-size:13px;
    font-weight:900; box-shadow:4px 4px 0 var(--tf-yellow); transition:transform .18s, box-shadow .18s;
  }
  .tf-primary:hover { transform:translate(2px,2px); box-shadow:2px 2px 0 var(--tf-yellow); }
  .tf-delivery-note { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:800; color:var(--tf-muted); }
  .tf-hero-image {
    position:relative; height:370px; overflow:hidden; background:#172419; border-radius:7px 74px 7px 7px;
    box-shadow:13px 13px 0 var(--tf-yellow);
  }
  .tf-hero-image:after { content:""; position:absolute; inset:48% 0 0; background:linear-gradient(0deg,rgba(14,27,18,.45),transparent); pointer-events:none; }
  .tf-hero-image img { width:100%; height:100%; object-fit:cover; object-position:58% 51%; display:block; }
  .tf-photo-label {
    position:absolute; z-index:1; right:17px; bottom:16px; display:flex; align-items:center; gap:7px;
    padding:10px 13px; color:#fff7e1; background:var(--tf-green); font-size:10px; font-weight:900;
    letter-spacing:.12em; text-transform:uppercase; border-radius:3px;
  }
  .tf-ribbon {
    display:flex; align-items:center; justify-content:space-between; gap:14px; overflow:hidden; white-space:nowrap;
    margin:0 calc((100vw - min(1240px, 100vw - 48px))/ -2); padding:13px max(24px, calc((100vw - 1240px)/2));
    background:var(--tf-green); color:#f7efd9; font-size:11px; font-weight:900; letter-spacing:.13em; text-transform:uppercase;
  }
  .tf-ribbon span { display:flex; align-items:center; gap:17px; }
  .tf-ribbon i { width:6px; height:6px; border-radius:50%; background:var(--tf-yellow); }
  .tf-menu { padding:63px 0 125px; scroll-margin-top:22px; }
  .tf-menu-head { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:23px; }
  .tf-eyebrow { color:var(--tf-orange); font-size:10px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
  .tf-menu-head h2 { margin:5px 0 0; font-family:Georgia, "Times New Roman", serif; font-size:42px; line-height:1; letter-spacing:-.055em; }
  .tf-count { padding:9px 12px; border:1px solid var(--tf-line); border-radius:99px; font-size:11px; font-weight:850; color:var(--tf-muted); }
  .tf-categories { display:flex; gap:8px; overflow-x:auto; padding:4px 2px 18px; scrollbar-width:none; }
  .tf-categories::-webkit-scrollbar { display:none; }
  .tf-filter {
    display:flex; align-items:center; gap:8px; border:1px solid var(--tf-line); border-radius:5px; padding:11px 14px;
    background:transparent; color:#526052; white-space:nowrap; font-size:12px; font-weight:850; transition:background .18s,color .18s,border-color .18s;
  }
  .tf-filter small { color:#9a9c8e; font-size:9px; font-weight:900; }
  .tf-filter:hover, .tf-filter.is-active { border-color:var(--tf-green); background:var(--tf-green); color:#fff5dc; }
  .tf-filter.is-active small { color:#f2c34e; }
  .tf-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
  .tf-card { min-width:0; overflow:hidden; background:var(--tf-paper); border:1px solid #e3decd; border-radius:7px; transition:transform .2s, box-shadow .2s; }
  .tf-card:hover { transform:translateY(-3px); box-shadow:0 12px 24px #273b2415; }
  .tf-card-photo { position:relative; height:174px; overflow:hidden; background:#e8d6a8; }
  .tf-card-photo img { display:block; width:100%; height:100%; object-fit:cover; transition:transform .4s; }
  .tf-card:hover .tf-card-photo img { transform:scale(1.045); }
  .tf-card-category { position:absolute; left:12px; top:12px; padding:6px 9px; color:var(--tf-green); background:#fff9e9; border-radius:3px; font-size:9px; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .tf-card-body { padding:15px 15px 14px; }
  .tf-card-title-row { display:flex; justify-content:space-between; align-items:start; gap:10px; }
  .tf-card h3 { margin:0; max-width:220px; font-family:Georgia, "Times New Roman", serif; font-size:18px; line-height:1.12; letter-spacing:-.035em; }
  .tf-price { flex:none; padding-top:1px; color:var(--tf-orange); font-size:14px; font-weight:950; white-space:nowrap; }
  .tf-card p { min-height:34px; margin:8px 0 13px; color:var(--tf-muted); font-size:11px; line-height:1.5; }
  .tf-card-foot { display:flex; align-items:center; justify-content:space-between; gap:9px; padding-top:12px; border-top:1px solid #ece7d8; }
  .tf-card-detail { font-size:10px; font-weight:800; color:#777d70; }
  .tf-add {
    display:inline-flex; align-items:center; gap:6px; min-height:35px; border:0; border-radius:4px; padding:0 12px;
    background:var(--tf-yellow); color:var(--tf-ink); font-size:11px; font-weight:950; transition:background .18s, transform .18s;
  }
  .tf-add:hover { background:#edb52a; transform:translateY(-1px); }
  .tf-footer { display:flex; justify-content:space-between; gap:20px; padding:22px 0 40px; border-top:1px solid var(--tf-line); color:var(--tf-muted); font-size:11px; }
  .tf-footer strong { color:var(--tf-ink); font-size:13px; }
  .tf-cart-dock {
    position:fixed; z-index:15; bottom:calc(18px + env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%);
    width:min(560px,calc(100% - 28px));
  }
  .tf-cart-button {
    width:100%; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 17px;
    border:1px solid #f4b846; border-radius:6px; color:#fff7e2; background:var(--tf-green-deep);
    box-shadow:0 10px 35px #17251944, 4px 4px 0 var(--tf-yellow); text-align:left;
  }
  .tf-cart-left { display:flex; align-items:center; gap:11px; }
  .tf-cart-icon { width:36px; height:36px; display:grid; place-items:center; border-radius:4px; background:var(--tf-yellow); color:var(--tf-green-deep); }
  .tf-cart-label { font-size:13px; font-weight:950; }
  .tf-cart-sub { margin-top:2px; color:#d1dac7; font-size:10px; }
  .tf-cart-total { display:flex; align-items:center; gap:8px; font-weight:950; font-size:14px; white-space:nowrap; }
  .tf-overlay { position:fixed; z-index:40; inset:0; display:flex; justify-content:center; align-items:flex-end; background:#102117a8; backdrop-filter:blur(3px); }
  .tf-sheet {
    width:min(680px,100%); max-height:calc(92dvh - env(safe-area-inset-top)); overflow:auto; padding:25px 25px calc(26px + env(safe-area-inset-bottom));
    border-radius:18px 18px 0 0; background:var(--tf-paper); box-shadow:0 -15px 45px #08140e35; animation:tf-rise .22s ease-out both;
  }
  @keyframes tf-rise { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  .tf-sheet-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; padding-bottom:17px; border-bottom:1px solid var(--tf-line); }
  .tf-sheet-head h2 { max-width:520px; margin:5px 0 4px; font-family:Georgia, "Times New Roman", serif; font-size:29px; line-height:1.05; letter-spacing:-.045em; }
  .tf-muted { color:var(--tf-muted); font-size:12px; line-height:1.5; }
  .tf-close { flex:none; width:38px; height:38px; display:grid; place-items:center; border:1px solid var(--tf-line); border-radius:50%; background:transparent; color:var(--tf-ink); }
  .tf-close:hover { background:#f2ead3; }
  .tf-qty-row { display:flex; justify-content:space-between; align-items:center; padding:16px 0; border-bottom:1px solid var(--tf-line); font-size:13px; font-weight:850; }
  .tf-qty { display:flex; align-items:center; gap:12px; }
  .tf-qty button { width:32px; height:32px; display:grid; place-items:center; border:1px solid var(--tf-line); border-radius:50%; background:transparent; color:var(--tf-ink); }
  .tf-flavor-head { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin:17px 0 6px; }
  .tf-label { color:var(--tf-ink); font-size:12px; font-weight:950; letter-spacing:.02em; }
  .tf-flavor-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee8d8; font-size:13px; }
  .tf-flavor-counter { display:flex; align-items:center; gap:10px; }
  .tf-flavor-counter button { width:29px; height:29px; display:grid; place-items:center; border:1px solid var(--tf-line); border-radius:50%; background:transparent; color:var(--tf-ink); }
  .tf-flavor-counter b { min-width:16px; text-align:center; font-size:12px; }
  .tf-extra-list { margin-top:12px; }
  .tf-extra { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid #eee8d8; font-size:13px; }
  .tf-extra label { display:flex; align-items:center; gap:9px; }
  .tf-extra input { accent-color:var(--tf-orange); width:17px; height:17px; }
  .tf-field { display:block; width:100%; min-height:45px; margin-top:7px; padding:11px 12px; border:1px solid var(--tf-line); border-radius:5px; outline:0; color:var(--tf-ink); background:#fffdf6; font-size:13px; }
  .tf-field:focus { border-color:var(--tf-green); box-shadow:0 0 0 3px #25463118; }
  .tf-field-group { margin:15px 0 0; }
  .tf-error { margin:13px 0 0; padding:11px 13px; border:1px solid #e5b6a4; border-radius:5px; color:#8a3522; background:#fff0e9; font-size:12px; }
  .tf-sheet-action { width:100%; min-height:50px; margin-top:18px; }
  .tf-sheet-action:disabled { opacity:1; background:#e4d9bc; color:#766c54; box-shadow:none; cursor:not-allowed; }
  .tf-helper { margin:8px 0 0; color:var(--tf-muted); font-size:11px; }
  .tf-cart-lines { margin:6px 0 15px; }
  .tf-line { display:flex; justify-content:space-between; gap:13px; padding:13px 0; border-bottom:1px solid #e9e3d2; }
  .tf-line-name { font-family:Georgia, "Times New Roman", serif; font-weight:900; font-size:16px; line-height:1.15; }
  .tf-line-detail { max-width:440px; margin-top:5px; color:var(--tf-muted); font-size:10px; line-height:1.5; }
  .tf-line-tools { display:flex; align-items:center; gap:8px; margin-top:9px; }
  .tf-line-tools button { width:27px; height:27px; display:grid; place-items:center; border:1px solid var(--tf-line); border-radius:50%; background:transparent; color:var(--tf-ink); }
  .tf-line-price { display:flex; align-items:flex-start; gap:5px; white-space:nowrap; font-size:12px; font-weight:900; }
  .tf-summary { padding-top:10px; border-top:1px solid var(--tf-line); }
  .tf-summary-row { display:flex; justify-content:space-between; padding:5px 0; color:#626c5f; font-size:12px; }
  .tf-summary-row.total { color:var(--tf-ink); font-size:17px; font-weight:950; }
  .tf-choice-row { display:flex; gap:8px; margin:15px 0 4px; }
  .tf-choice { padding:9px 12px; border:1px solid var(--tf-line); border-radius:4px; color:var(--tf-ink); background:transparent; font-size:11px; font-weight:900; }
  .tf-choice.is-active { border-color:var(--tf-green); background:var(--tf-green); color:#fff4db; }
  .tf-success { padding:33px 4px 9px; text-align:center; }
  .tf-success-mark { width:54px; height:54px; display:grid; place-items:center; margin:0 auto 16px; border-radius:50%; background:#e1edd9; color:var(--tf-green); }
  .tf-success h3 { margin:0 0 8px; font-family:Georgia, "Times New Roman", serif; font-size:30px; letter-spacing:-.04em; }
  .tf-success p { max-width:400px; margin:0 auto; color:var(--tf-muted); font-size:13px; line-height:1.6; }
  .tf-success .tf-primary { margin-top:22px; }
  @media (min-width:1000px) { .tf-menu { padding-top:75px; } }
  @media (max-width:900px) {
    .tf-hero { grid-template-columns:.88fr 1.12fr; gap:25px; min-height:385px; }
    .tf-hero-image { height:320px; }
    .tf-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @media (max-width:640px) {
    .tf-wrap { width:calc(100% - 32px); }
    .tf-top { height:68px; }
    .tf-mark { width:39px; height:39px; border-radius:12px 12px 12px 4px; font-size:18px; }
    .tf-brand-name { font-size:18px; }
    .tf-brand-sub { font-size:8px; letter-spacing:.1em; }
    .tf-top-meta { gap:0; }
    .tf-location { display:none; }
    .tf-open { font-size:10px; }
    .tf-hero { display:flex; flex-direction:column-reverse; align-items:stretch; gap:0; min-height:0; padding:19px 0 30px; }
    .tf-hero-image { height:286px; border-radius:5px 54px 5px 5px; box-shadow:7px 7px 0 var(--tf-yellow); }
    .tf-hero-image img { object-position:60% center; }
    .tf-hero-copy { padding:27px 2px 3px; }
    .tf-kicker { font-size:9px; }
    .tf-hero h1 { max-width:430px; margin:13px 0 12px; font-size:clamp(48px,13vw,65px); }
    .tf-hero-copy p { max-width:380px; font-size:13px; line-height:1.55; }
    .tf-hero-cta { gap:14px; margin-top:18px; }
    .tf-primary { min-height:46px; padding:0 16px; font-size:12px; }
    .tf-delivery-note { font-size:10px; }
    .tf-ribbon { justify-content:flex-start; gap:22px; margin:0 -16px; padding:11px 16px; font-size:9px; }
    .tf-menu { padding:40px 0 140px; scroll-margin-top:12px; }
    .tf-menu-head { margin-bottom:16px; }
    .tf-menu-head h2 { font-size:35px; }
    .tf-count { font-size:10px; padding:8px 10px; }
    .tf-categories { margin-right:-16px; padding:3px 16px 16px 1px; }
    .tf-filter { padding:10px 12px; font-size:11px; }
    .tf-grid { grid-template-columns:1fr; gap:11px; }
    .tf-card { display:grid; grid-template-columns:112px minmax(0,1fr); min-height:144px; }
    .tf-card-photo { height:100%; min-height:144px; }
    .tf-card-category { left:7px; top:7px; max-width:98px; padding:5px 6px; font-size:7px; }
    .tf-card-body { display:flex; flex-direction:column; justify-content:space-between; padding:12px 11px 10px; }
    .tf-card h3 { font-size:16px; }
    .tf-price { font-size:12px; }
    .tf-card p { min-height:0; margin:6px 0 7px; font-size:10px; }
    .tf-card-foot { padding-top:8px; }
    .tf-card-detail { font-size:9px; }
    .tf-add { min-height:32px; padding:0 9px; font-size:10px; }
    .tf-footer { padding-bottom:32px; }
    .tf-footer span:last-child { text-align:right; }
    .tf-cart-dock { bottom:calc(12px + env(safe-area-inset-bottom)); width:calc(100% - 24px); }
    .tf-cart-button { padding:10px 12px; }
    .tf-cart-icon { width:33px; height:33px; }
    .tf-cart-label { font-size:12px; }
    .tf-cart-sub { font-size:9px; }
    .tf-cart-total { font-size:12px; }
    .tf-sheet { padding:22px 17px calc(22px + env(safe-area-inset-bottom)); max-height:calc(94dvh - env(safe-area-inset-top)); }
    .tf-sheet-head h2 { font-size:25px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .tf-page *, .tf-page *:before, .tf-page *:after { animation-duration:.01ms !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
  }
`;

export function Redesign() {
  const [category, setCategory] = useState<'ALL' | Category>('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [flavorMap, setFlavorMap] = useState<Record<string, number>>({});
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [lineNotes, setLineNotes] = useState('');
  const [customizeError, setCustomizeError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer>({
    customerName: '', phone: '', fulfillment: 'DELIVERY', address: '', reference: '',
    notes: '', paymentMethod: 'PIX',
  });
  const [orderError, setOrderError] = useState('');
  const [orderReady, setOrderReady] = useState(false);
  const visible = useMemo(
    () => products.filter(product => product.active && (category === 'ALL' || product.category === category)),
    [category],
  );
  const subtotal = cart.reduce(
    (sum, line) => sum + (line.product.price + line.product.extras.filter(extra => line.extras.includes(extra.name)).reduce((n, extra) => n + extra.price, 0)) * line.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const flavorTotal = Object.values(flavorMap).reduce((sum, count) => sum + count, 0);
  const requiredFlavors = qty * (customizing?.unitCount ?? 1);

  const beginCustomize = (product: Product) => {
    setCustomizing(product);
    setQty(1);
    setFlavorMap({});
    setExtraNames([]);
    setLineNotes('');
    setCustomizeError('');
  };
  const changeCustomizeQty = (next: number) => {
    const value = Math.max(1, next);
    if (customizing?.unitCount && value < qty) {
      setFlavorMap(current => {
        const trimmed = { ...current };
        let excess = Object.values(trimmed).reduce((sum, count) => sum + count, 0) - value * customizing.unitCount!;
        for (const flavor of [...Object.keys(trimmed)].reverse()) {
          if (excess <= 0) break;
          const remove = Math.min(trimmed[flavor] ?? 0, excess);
          trimmed[flavor] = (trimmed[flavor] ?? 0) - remove;
          excess -= remove;
        }
        return trimmed;
      });
    }
    setQty(value);
    setCustomizeError('');
  };
  const setFlavorQty = (name: string, next: number) => {
    if (!customizing) return;
    const currentTotal = Object.values(flavorMap).reduce((a, b) => a + b, 0);
    const prior = flavorMap[name] ?? 0;
    if (next > prior && currentTotal >= requiredFlavors) return;
    setFlavorMap(current => ({ ...current, [name]: Math.max(0, next) }));
    setCustomizeError('');
  };
  const addCustomized = () => {
    if (!customizing) return;
    if (customizing.flavors.length && flavorTotal !== requiredFlavors) {
      setCustomizeError(`Escolha ${requiredFlavors - flavorTotal} sabor(es) para completar o combo.`);
      return;
    }
    const flavors = Object.entries(flavorMap).filter(([, count]) => count > 0).map(([name, quantity]) => ({ name, quantity }));
    setCart(current => [...current, { product: customizing, quantity: qty, flavors, extras: extraNames, notes: lineNotes.trim() }]);
    setCustomizing(null);
  };
  const setCartQuantity = (index: number, next: number) => {
    if (next < 1) return;
    setCart(current => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const unitCount = line.product.unitCount;
      if (!unitCount) return { ...line, quantity: next };
      const target = unitCount * next;
      const currentTotal = line.flavors.reduce((sum, flavor) => sum + flavor.quantity, 0);
      if (!currentTotal) return { ...line, quantity: next };
      const scaled = line.flavors.map(flavor => ({ ...flavor, quantity: Math.floor(flavor.quantity * target / currentTotal) }));
      let remainder = target - scaled.reduce((sum, flavor) => sum + flavor.quantity, 0);
      for (let i = 0; remainder > 0 && i < scaled.length; i += 1, remainder -= 1) scaled[i].quantity += 1;
      return { ...line, quantity: next, flavors: scaled.filter(flavor => flavor.quantity > 0) };
    }));
  };
  const unitLineTotal = (line: CartLine) =>
    (line.product.price + line.product.extras.filter(extra => line.extras.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0)) * line.quantity;
  const submitOrder = () => {
    setOrderError('');
    if (!customer.customerName.trim() || customer.phone.replace(/\D/g, '').length < 8) {
      setOrderError('Informe seu nome e um telefone válido para revisar o pedido.');
      return;
    }
    if (customer.fulfillment === 'DELIVERY' && customer.address.trim().length < 5) {
      setOrderError('Informe o endereço completo para entrega.');
      return;
    }
    setOrderReady(true);
  };

  return (
    <main className="tf-page">
      <style>{css}</style>
      <div className="tf-wrap">
        <header className="tf-top">
          <div className="tf-brand" aria-label="3 Foods">
            <div className="tf-mark">3F</div>
            <div><div className="tf-brand-name">3 Foods</div><div className="tf-brand-sub">Lanche de verdade, no seu bairro</div></div>
          </div>
          <div className="tf-top-meta">
            <div className="tf-open"><span className="tf-dot" /> Aberto agora</div>
            <div className="tf-location">Feito na hora · Entrega grátis</div>
          </div>
        </header>

        <section className="tf-hero">
          <div className="tf-hero-copy">
            <div className="tf-kicker">Seu intervalo pede 3 Foods</div>
            <h1>Fome boa<br />tem <em>endereço.</em></h1>
            <p>Crepes quentinhos, pastéis crocantes e batata caprichada. Feitos na hora, do jeitinho que você gosta.</p>
            <div className="tf-hero-cta">
              <button className="tf-primary" onClick={() => document.getElementById('tf-menu')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver cardápio <ArrowDown size={16} />
              </button>
              <div className="tf-delivery-note"><Clock3 size={15} /> Preparado na hora</div>
            </div>
          </div>
          <div className="tf-hero-image">
            <img src="/__mockup/images/3foods-hero.jpg" alt="Crepe recheado, pastéis dourados e batatas fritas da 3 Foods" />
            <div className="tf-photo-label">Sai quentinho da cozinha</div>
          </div>
        </section>
      </div>

      <div className="tf-ribbon" aria-label="Comida feita na hora">
        <span>Feito na hora <i /></span><span>Porção caprichada <i /></span><span>Comida de bairro <i /></span><span>Feito na hora <i /></span>
      </div>

      <section className="tf-wrap tf-menu" id="tf-menu">
        <div className="tf-menu-head">
          <div><div className="tf-eyebrow">Escolha seu favorito</div><h2>Nosso cardápio</h2></div>
          <div className="tf-count">{visible.length} {visible.length === 1 ? 'opção' : 'opções'}</div>
        </div>
        <nav className="tf-categories" aria-label="Filtrar por categoria">
          {categories.map(option => (
            <button key={option.key} className={`tf-filter ${category === option.key ? 'is-active' : ''}`} onClick={() => setCategory(option.key)}>
              <small>{option.number}</small>{option.label}
            </button>
          ))}
        </nav>
        <div className="tf-grid">
          {visible.map((product, index) => (
            <article className="tf-card" key={product.id} style={{ animationDelay: `${index * 35}ms` }}>
              <div className="tf-card-photo">
                <img src={product.imageUrl} alt={product.name} loading={index > 2 ? 'lazy' : 'eager'} />
                <div className="tf-card-category">{categoryName[product.category]}</div>
              </div>
              <div className="tf-card-body">
                <div>
                  <div className="tf-card-title-row"><h3>{product.name}</h3><div className="tf-price">{money(product.price)}</div></div>
                  <p>{product.description}</p>
                </div>
                <div className="tf-card-foot">
                  <span className="tf-card-detail">{product.unitCount ? `${product.unitCount} unidades · ${product.flavors.length} sabores` : 'Feito na hora'}</span>
                  <button className="tf-add" onClick={() => beginCustomize(product)}>Escolher <Plus size={13} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="tf-wrap tf-footer">
        <span><strong>3 Foods</strong><br />Lanche de verdade, no seu bairro.</span>
        <span>Feito na hora. Com capricho.</span>
      </footer>

      {cart.length > 0 && (
        <div className="tf-cart-dock">
          <button className="tf-cart-button" onClick={() => { setCartOpen(true); setOrderReady(false); }}>
            <span className="tf-cart-left"><span className="tf-cart-icon"><ShoppingBag size={18} /></span><span><span className="tf-cart-label">Sua sacola · {itemCount} {itemCount === 1 ? 'item' : 'itens'}</span><span className="tf-cart-sub">Tudo certo? Revise seu pedido</span></span></span>
            <span className="tf-cart-total">{money(subtotal)} <ArrowRight size={17} /></span>
          </button>
        </div>
      )}

      {customizing && (
        <div className="tf-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setCustomizing(null); }}>
          <section className="tf-sheet" role="dialog" aria-modal="true" aria-label={`Personalizar ${customizing.name}`}>
            <div className="tf-sheet-head">
              <div><div className="tf-eyebrow">{categoryName[customizing.category]}</div><h2>{customizing.name}</h2><div className="tf-muted">{customizing.description}</div></div>
              <button className="tf-close" aria-label="Fechar" onClick={() => setCustomizing(null)}><X size={18} /></button>
            </div>
            <div className="tf-qty-row"><span>Quantidade</span><div className="tf-qty"><button aria-label="Diminuir quantidade" onClick={() => changeCustomizeQty(qty - 1)}><Minus size={15} /></button><b>{qty}</b><button aria-label="Aumentar quantidade" onClick={() => changeCustomizeQty(qty + 1)}><Plus size={15} /></button></div></div>
            {customizing.flavors.length > 0 && <>
              <div className="tf-flavor-head"><div className="tf-label">Monte seu combo</div><div className="tf-muted">{flavorTotal} de {requiredFlavors} escolhidos</div></div>
              {customizing.flavors.map(flavor => (
                <div className="tf-flavor-row" key={flavor}><span>{flavor}</span><div className="tf-flavor-counter">
                  <button aria-label={`Diminuir ${flavor}`} onClick={() => setFlavorQty(flavor, (flavorMap[flavor] ?? 0) - 1)}><Minus size={13} /></button>
                  <b>{flavorMap[flavor] ?? 0}</b>
                  <button aria-label={`Aumentar ${flavor}`} onClick={() => setFlavorQty(flavor, (flavorMap[flavor] ?? 0) + 1)}><Plus size={13} /></button>
                </div></div>
              ))}
              {customizeError && <div className="tf-error">{customizeError}</div>}
            </>}
            {customizing.extras.length > 0 && <div className="tf-field-group">
              <div className="tf-label">Um extra fica bom, né?</div>
              <div className="tf-extra-list">{customizing.extras.map(extra => (
                <div className="tf-extra" key={extra.name}><label><input type="checkbox" checked={extraNames.includes(extra.name)} onChange={event => setExtraNames(names => event.target.checked ? [...names, extra.name] : names.filter(name => name !== extra.name))} />{extra.name}</label><b>+ {money(extra.price)}</b></div>
              ))}</div>
            </div>}
            {(customizing.category === 'BATATA' || customizing.flavors.length === 0) && <label className="tf-field-group">
              <span className="tf-label">Observações do item</span>
              <textarea className="tf-field" rows={2} placeholder="Ex.: sem molho, bem passado..." value={lineNotes} onChange={event => setLineNotes(event.target.value)} />
            </label>}
            <button className="tf-primary tf-sheet-action" onClick={addCustomized}>
              Colocar na sacola · {money((customizing.price + customizing.extras.filter(extra => extraNames.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0)) * qty)}
              <ArrowRight size={16} />
            </button>
            {customizing.flavors.length > 0 && <p className="tf-helper">Escolha todos os sabores para completar seu combo. O botão adiciona o pedido assim que estiver completo.</p>}
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="tf-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <section className="tf-sheet" role="dialog" aria-modal="true" aria-label="Sua sacola">
            <div className="tf-sheet-head">
              <div><div className="tf-eyebrow">Quase lá</div><h2>Sua sacola</h2><div className="tf-muted">Confira os detalhes antes de revisar seu pedido.</div></div>
              <button className="tf-close" aria-label="Fechar sacola" onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            {orderReady ? (
              <div className="tf-success">
                <div className="tf-success-mark"><Check size={25} /></div>
                <h3>Pedido revisado!</h3>
                <p>Seu pedido está pronto para ser confirmado com a loja. Esta demonstração não envia dados nem realiza uma compra.</p>
                <button className="tf-primary" onClick={() => { setOrderReady(false); setCartOpen(false); }}>Voltar ao cardápio <ArrowRight size={15} /></button>
              </div>
            ) : <>
              <div className="tf-cart-lines">
                {cart.map((line, index) => (
                  <div className="tf-line" key={`${line.product.id}-${index}`}>
                    <div>
                      <div className="tf-line-name">{line.product.name}</div>
                      <div className="tf-line-detail">{[
                        line.flavors.map(flavor => `${flavor.quantity} ${flavor.name}`).join(', '),
                        line.extras.join(', '),
                        line.notes,
                      ].filter(Boolean).join(' · ')}</div>
                      <div className="tf-line-tools">
                        <button aria-label={`Diminuir ${line.product.name}`} disabled={line.quantity <= 1} onClick={() => setCartQuantity(index, line.quantity - 1)}><Minus size={12} /></button>
                        <b>{line.quantity}</b>
                        <button aria-label={`Aumentar ${line.product.name}`} onClick={() => setCartQuantity(index, line.quantity + 1)}><Plus size={12} /></button>
                      </div>
                    </div>
                    <div className="tf-line-price">{money(unitLineTotal(line))}<button className="tf-close" aria-label={`Remover ${line.product.name}`} onClick={() => setCart(current => current.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>
                  </div>
                ))}
                {cart.length === 0 && <div className="tf-muted" style={{ padding: '20px 0' }}>Sua sacola está vazia. Escolha algo gostoso no cardápio.</div>}
              </div>
              {cart.length > 0 && <>
                <div className="tf-choice-row">
                  <button className={`tf-choice ${customer.fulfillment === 'DELIVERY' ? 'is-active' : ''}`} onClick={() => setCustomer(current => ({ ...current, fulfillment: 'DELIVERY' }))}>Entrega</button>
                  <button className={`tf-choice ${customer.fulfillment === 'PICKUP' ? 'is-active' : ''}`} onClick={() => setCustomer(current => ({ ...current, fulfillment: 'PICKUP' }))}>Retirada</button>
                </div>
                <div className="tf-field-group"><label className="tf-label">Seu nome</label><input className="tf-field" value={customer.customerName} onChange={event => setCustomer(current => ({ ...current, customerName: event.target.value }))} placeholder="Como podemos chamar você?" /></div>
                <div className="tf-field-group"><label className="tf-label">WhatsApp / telefone</label><input className="tf-field" inputMode="tel" value={customer.phone} onChange={event => setCustomer(current => ({ ...current, phone: event.target.value }))} placeholder="(11) 99999-9999" /></div>
                {customer.fulfillment === 'DELIVERY' && <>
                  <div className="tf-field-group"><label className="tf-label">Endereço completo</label><input className="tf-field" value={customer.address} onChange={event => setCustomer(current => ({ ...current, address: event.target.value }))} placeholder="Rua, número, bairro e cidade" /></div>
                  <div className="tf-field-group"><label className="tf-label">Referência (opcional)</label><input className="tf-field" value={customer.reference} onChange={event => setCustomer(current => ({ ...current, reference: event.target.value }))} placeholder="Portão, bloco, ponto próximo" /></div>
                </>}
                <div className="tf-field-group"><label className="tf-label">Forma de pagamento</label><select className="tf-field" value={customer.paymentMethod} onChange={event => setCustomer(current => ({ ...current, paymentMethod: event.target.value as Customer['paymentMethod'] }))}><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão na entrega</option></select></div>
                <div className="tf-field-group"><label className="tf-label">Observações do pedido</label><textarea className="tf-field" rows={2} value={customer.notes} onChange={event => setCustomer(current => ({ ...current, notes: event.target.value }))} placeholder="Alguma orientação para a loja?" /></div>
                <div className="tf-summary"><div className="tf-summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="tf-summary-row"><span>Entrega</span><span>Grátis</span></div><div className="tf-summary-row total"><span>Total</span><span>{money(subtotal)}</span></div></div>
                {orderError && <div className="tf-error">{orderError}</div>}
                <button className="tf-primary tf-sheet-action" onClick={submitOrder}>Revisar pedido <ArrowRight size={16} /></button>
                <p className="tf-helper">Prévia demonstrativa: nenhum pedido será enviado nem pagamento realizado.</p>
              </>}
            </>}
          </section>
        </div>
      )}
    </main>
  );
}
