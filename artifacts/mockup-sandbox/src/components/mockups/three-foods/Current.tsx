import { useState } from 'react';
import { ArrowRight, Clock3, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from 'lucide-react';
import './_group.css';

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

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const categoryName: Record<string, string> = {
  CREPES: 'Crepes',
  MINI_PASTEIS_6: 'Mini pastéis · 6 un.',
  MINI_PASTEIS_12: 'Mini pastéis · 12 un.',
  BATATA: 'Batatas',
};
const categoryOptions: Category[] = ['CREPES', 'MINI_PASTEIS_6', 'MINI_PASTEIS_12', 'BATATA'];
const settings = {
  name: 'Lanche da Casa',
  tagline: 'Seu lanche favorito, feito na hora.',
  logoUrl: null,
  whatsappNumber: '',
  deliveryFee: 0,
};
const comboFlavors = ['Queijo', 'Carne', 'Frango', 'Pizza', 'Presunto e queijo'];
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

export function Current() {
  const [category, setCategory] = useState('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [flavorMap, setFlavorMap] = useState<Record<string, number>>({});
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [lineNotes, setLineNotes] = useState('');
  const [customizeError, setCustomizeError] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ customerName: '', phone: '', fulfillment: 'DELIVERY' as 'DELIVERY' | 'PICKUP', address: '', reference: '', notes: '', paymentMethod: 'PIX' as 'CASH' | 'PIX' | 'CARD' });
  const [orderError, setOrderError] = useState('');
  const visible = products.filter(p => p.active && (category === 'ALL' || p.category === category));
  const subtotal = cart.reduce((sum, line) => sum + (line.product.price + line.product.extras.filter(e => line.extras.includes(e.name)).reduce((n, e) => n + e.price, 0)) * line.quantity, 0);
  const deliveryFee = customer.fulfillment === 'DELIVERY' ? settings.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const beginCustomize = (p: Product) => { setCustomizing(p); setQty(1); setFlavorMap({}); setExtraNames([]); setLineNotes(''); setCustomizeError(''); };
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
  };
  const addCustomized = () => {
    if (!customizing) return;
    const selectedCount = Object.values(flavorMap).reduce((sum, count) => sum + count, 0);
    const requiredCount = qty * (customizing.unitCount ?? 1);
    if (customizing.flavors.length && selectedCount !== requiredCount) {
      setCustomizeError(`Selecione exatamente ${requiredCount} unidade(s) para continuar.`);
      return;
    }
    const flavors = Object.entries(flavorMap).filter(([, quantity]) => quantity > 0).map(([name, quantity]) => ({ name, quantity }));
    setCart(prev => [...prev, { product: customizing, quantity: qty, flavors, extras: extraNames, notes: lineNotes.trim() }]);
    setCustomizing(null);
  };
  const setFlavorQty = (name: string, next: number) => {
    if (!customizing) return;
    const currentTotal = Object.values(flavorMap).reduce((a, b) => a + b, 0);
    const prior = flavorMap[name] ?? 0;
    if (next > prior && currentTotal >= qty * (customizing.unitCount ?? 1)) return;
    setFlavorMap(prev => ({ ...prev, [name]: Math.max(0, next) }));
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
  const submitOrder = () => {
    setOrderError('');
    if (!customer.customerName.trim() || customer.phone.replace(/\D/g, '').length < 8) { setOrderError('Informe seu nome e um telefone válido.'); return; }
    if (customer.fulfillment === 'DELIVERY' && customer.address.trim().length < 5) { setOrderError('Informe o endereço completo para entrega.'); return; }
    if (!settings.whatsappNumber.replace(/\D/g, '')) { setOrderError('A loja ainda não configurou o WhatsApp. Fale com a loja para concluir seu pedido.'); return; }
  };

  return <main className="grain page-enter">
    <div className="shell">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>{settings.logoUrl ? <img src={settings.logoUrl} alt="" className="brand-mark" style={{ objectFit: 'cover' }} /> : <div className="brand-mark">{settings.name.slice(0, 1).toUpperCase()}</div>}<div><strong data-testid="text-store-name">{settings.name}</strong><div className="tiny">{settings.tagline || 'Feito na hora, do nosso jeito'}</div></div></div>
        <a href="/admin" className="tiny" style={{ textDecoration: 'none' }}>Área da loja <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></a>
      </header>
      <section className="hero">
        <div>
          <span className="pill" style={{ background: 'hsl(var(--accent))', color: 'white' }}>LANCHES COM CARINHO</span>
          <h1 className="serif" style={{ fontSize: 58, lineHeight: .99, letterSpacing: '-.04em', margin: '18px 0 14px', maxWidth: 540 }}>Seu intervalo<br />merece <span style={{ color: 'hsl(var(--primary))' }}>algo bom.</span></h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'hsl(var(--muted-foreground))', maxWidth: 410, margin: '0 0 20px' }}>{settings.tagline || 'Crepes, pastéis e batatas feitos na hora. Escolha o seu e peça pelo WhatsApp.'}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><span className="pill"><Clock3 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Preparado na hora</span><span className="pill">Entrega {money(settings.deliveryFee)}</span></div>
        </div>
        <div className="hero-visual" aria-label="Ilustração de um crepe dourado"><span className="sun-tag">QUENTINHO E FRESCO</span><div className="food-plate" /></div>
      </section>
      <div className="section-head"><div><div className="tiny" style={{ letterSpacing: '.12em' }}>ESCOLHA SEU FAVORITO</div><h2 className="serif" style={{ fontSize: 32, margin: '3px 0' }}>Nosso cardápio</h2></div><span className="tiny">{visible.length} opções</span></div>
      <nav className="categories">
        {[['ALL', 'Tudo'], ...categoryOptions.map(c => [c, categoryName[c]])].map(([key, label]) => <button key={key} className={`pill ${category === key ? 'btn' : ''}`} onClick={() => setCategory(key)}>{label}</button>)}
      </nav>
      {visible.length ? <div className="menu-grid">{visible.map(product => <ProductCard key={product.id} product={product} onAdd={() => beginCustomize(product)} />)}</div> : <div className="empty"><UtensilsCrossed size={27} /><h3 className="serif" style={{ color: 'hsl(var(--foreground))' }}>Ainda não tem nada por aqui</h3><p>Volte em breve para conferir as novidades.</p></div>}
      <footer style={{ padding: '42px 0 105px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border))', marginTop: 42 }}><span><strong>{settings.name}</strong><div className="tiny">{settings.tagline}</div></span><span className="tiny">Feito para comer bem.</span></footer>
    </div>
    {cart.length > 0 && <div className="cart-dock"><button className="btn" onClick={() => setCheckout(true)}><span><ShoppingBag size={17} style={{ verticalAlign: 'middle', marginRight: 9 }} /> Ver sacola · {cart.reduce((n, l) => n + l.quantity, 0)} itens</span><span>{money(subtotal)} <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 7 }} /></span></button></div>}
    {customizing && <div className="overlay" onClick={() => setCustomizing(null)}><section className="sheet page-enter" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><span className="tiny">{categoryName[customizing.category]}</span><h2 className="serif" style={{ fontSize: 29, margin: '4px 0' }}>{customizing.name}</h2><p className="tiny">{customizing.description}</p></div><button className="icon-btn" onClick={() => setCustomizing(null)} aria-label="Fechar"><X size={18} /></button></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid hsl(var(--border))' }}><span>Quantidade</span><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button className="icon-btn" aria-label="Diminuir quantidade" onClick={() => changeCustomizeQty(qty - 1)}><Minus size={16} /></button><b>{qty}</b><button className="icon-btn" aria-label="Aumentar quantidade" onClick={() => changeCustomizeQty(qty + 1)}><Plus size={16} /></button></div></div>
      {customizing.flavors.length > 0 && <div><div className="label">{customizing.unitCount ? `Distribua os sabores · ${qty * customizing.unitCount} unidades` : 'Escolha os sabores'}</div>{customizing.flavors.map(flavor => <div key={flavor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}><span>{flavor}</span><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><button className="icon-btn" aria-label={`Diminuir ${flavor}`} onClick={() => setFlavorQty(flavor, (flavorMap[flavor] ?? 0) - 1)}><Minus size={14} /></button><b>{flavorMap[flavor] ?? 0}</b><button className="icon-btn" aria-label={`Aumentar ${flavor}`} onClick={() => setFlavorQty(flavor, (flavorMap[flavor] ?? 0) + 1)}><Plus size={14} /></button></div></div>)}<p className="tiny">Selecionados: {Object.values(flavorMap).reduce((a, b) => a + b, 0)} / {qty * (customizing.unitCount ?? 1)}</p>{customizeError && <p className="error-box">{customizeError}</p>}</div>}
      {customizing.extras.length > 0 && <div className="field-group"><div className="label">Quer adicionar algo?</div>{customizing.extras.map(extra => <label key={extra.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span><input type="checkbox" checked={extraNames.includes(extra.name)} onChange={e => setExtraNames(v => e.target.checked ? [...v, extra.name] : v.filter(x => x !== extra.name))} /> {extra.name}</span><span>+ {money(extra.price)}</span></label>)}</div>}
      {(customizing.category === 'BATATA' || customizing.flavors.length === 0) && <div className="field-group"><label className="label">Observações do item</label><textarea className="field" rows={2} placeholder="Ex.: sem molho, bem passado..." value={lineNotes} onChange={e => setLineNotes(e.target.value)} /></div>}
      <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={addCustomized} disabled={customizing.flavors.length > 0 && Object.values(flavorMap).reduce((a, b) => a + b, 0) !== qty * (customizing.unitCount ?? 1)}>Adicionar à sacola · {money((customizing.price + customizing.extras.filter(e => extraNames.includes(e.name)).reduce((a, e) => a + e.price, 0)) * qty)}</button>
    </section></div>}
    {checkout && <div className="overlay" onClick={() => setCheckout(false)}><section className="sheet page-enter" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span className="tiny">QUASE LÁ</span><h2 className="serif" style={{ fontSize: 30, margin: '2px 0 10px' }}>Sua sacola</h2></div><button className="icon-btn" onClick={() => setCheckout(false)}><X size={18} /></button></div>
      {cart.map((line, index) => <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid hsl(var(--border))' }}><div style={{ minWidth: 0 }}><b>{line.product.name}</b><div className="tiny">{[line.flavors.map(f => `${f.quantity} ${f.name}`).join(', '), line.extras.join(', '), line.notes].filter(Boolean).join(' · ')}</div><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8 }}><button className="icon-btn" aria-label={`Diminuir ${line.product.name}`} onClick={() => setCartQuantity(index, line.quantity - 1)} disabled={line.quantity <= 1}><Minus size={13} /></button><b>{line.quantity}</b><button className="icon-btn" aria-label={`Aumentar ${line.product.name}`} onClick={() => setCartQuantity(index, line.quantity + 1)}><Plus size={13} /></button></div></div><div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money((line.product.price + line.product.extras.filter(e => line.extras.includes(e.name)).reduce((a, e) => a + e.price, 0)) * line.quantity)}<button className="icon-btn" aria-label={`Remover ${line.product.name}`} style={{ marginLeft: 8, display: 'inline-grid', width: 30, height: 30 }} onClick={() => setCart(c => c.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div></div>)}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}><button className={`pill ${customer.fulfillment === 'DELIVERY' ? 'btn' : ''}`} onClick={() => setCustomer(c => ({ ...c, fulfillment: 'DELIVERY' }))}>Entrega</button><button className={`pill ${customer.fulfillment === 'PICKUP' ? 'btn' : ''}`} onClick={() => setCustomer(c => ({ ...c, fulfillment: 'PICKUP' }))}>Retirada</button></div>
      <div className="field-group"><label className="label">Seu nome</label><input className="field" value={customer.customerName} onChange={e => setCustomer(c => ({ ...c, customerName: e.target.value }))} placeholder="Como podemos chamar você?" /></div>
      <div className="field-group"><label className="label">WhatsApp / telefone</label><input className="field" inputMode="tel" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
      {customer.fulfillment === 'DELIVERY' && <><div className="field-group"><label className="label">Endereço completo</label><input className="field" value={customer.address} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))} placeholder="Rua, número, bairro e cidade" /></div><div className="field-group"><label className="label">Referência (opcional)</label><input className="field" value={customer.reference} onChange={e => setCustomer(c => ({ ...c, reference: e.target.value }))} placeholder="Portão, bloco, ponto próximo" /></div></>}
      <div className="field-group"><label className="label">Forma de pagamento</label><select className="field" value={customer.paymentMethod} onChange={e => setCustomer(c => ({ ...c, paymentMethod: e.target.value as typeof c.paymentMethod }))}><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão na entrega</option></select></div>
      <div className="field-group"><label className="label">Observações do pedido</label><textarea className="field" rows={2} value={customer.notes} onChange={e => setCustomer(c => ({ ...c, notes: e.target.value }))} placeholder="Alguma orientação para a loja?" /></div>
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}><SummaryRow label="Subtotal" value={money(subtotal)} /><SummaryRow label="Entrega" value={money(deliveryFee)} /><SummaryRow label="Total" value={money(total)} strong /></div>
      {orderError && <p className="error-box">{orderError}</p>}
      <button className="btn" style={{ width: '100%', marginTop: 14 }} disabled={cart.length === 0} onClick={submitOrder}>Confirmar e continuar no WhatsApp <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} /></button>
      <p className="tiny" style={{ textAlign: 'center' }}>Seu pedido é salvo primeiro. Depois, você confirma os detalhes pelo WhatsApp.</p>
    </section></div>}
  </main>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: strong ? 700 : 400, fontSize: strong ? 18 : 14 }}><span>{label}</span><span>{value}</span></div>;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return <article className="product-card" data-testid={`card-product-${product.id}`}>
    <div className="product-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="photo-art" />}</div>
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}><div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}><h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{product.name}</h3><b style={{ whiteSpace: 'nowrap', color: 'hsl(var(--primary))' }}>{money(product.price)}</b></div><p className="tiny" style={{ margin: '0 0 8px', lineHeight: 1.4 }}>{product.description}</p><div className="tiny">{product.unitCount ? `${product.unitCount} unidades` : product.flavors.length ? `${product.flavors.length} sabores` : 'Feito na hora'}</div></div><button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '8px 13px', fontSize: 12, marginTop: 8 }} onClick={onAdd}>Escolher <Plus size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /></button></div>
  </article>;
}
