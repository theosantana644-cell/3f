import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useCreateOrder, useCreateProduct, useDeleteProduct, useGetAdminStatus, useGetStore,
  useListAdminOrders, useListAdminProducts, useLoginAdmin, useLogoutAdmin,
  useSetupAdmin, useUpdateProduct, useUpdateStore,
  getGetStoreQueryKey, getGetAdminStatusQueryKey, getListAdminProductsQueryKey, getListAdminOrdersQueryKey,
} from '@workspace/api-client-react';
import type { OrderInput, OrderLineInput, Product, ProductInput, StoreInput } from '@workspace/api-client-react';
import { ProductCategory, OrderInputFulfillment, OrderInputPaymentMethod } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, ChevronDown, Clock3, LogOut, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import type { ReactNode } from 'react';
import NotFound from '@/pages/not-found';

const client = new QueryClient();
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const categoryName: Record<string, string> = { CREPES: 'Crepes', MINI_PASTEIS_6: 'Mini pastéis · 6 un.', MINI_PASTEIS_12: 'Mini pastéis · 12 un.', BATATA: 'Batatas' };
const categoryOptions = [ProductCategory.CREPES, ProductCategory.MINI_PASTEIS_6, ProductCategory.MINI_PASTEIS_12, ProductCategory.BATATA];

type CartLine = OrderLineInput & { product: Product };
function App() {
  return <QueryClientProvider client={client}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Switch><Route path="/" component={Shop} /><Route path="/admin" component={Admin} /><Route component={NotFound} /></Switch></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Shop() {
  const storeQuery = useGetStore();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [flavorMap, setFlavorMap] = useState<Record<string, number>>({});
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [lineNotes, setLineNotes] = useState('');
  const [customizeError, setCustomizeError] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ customerName: '', phone: '', fulfillment: OrderInputFulfillment.DELIVERY as 'DELIVERY' | 'PICKUP', address: '', reference: '', notes: '', paymentMethod: OrderInputPaymentMethod.PIX as 'CASH' | 'PIX' | 'CARD' });
  const [orderError, setOrderError] = useState('');
  const settings = storeQuery.data?.settings;
  const products = storeQuery.data?.products ?? [];
  const visible = products.filter(p => p.active && (category === 'ALL' || p.category === category));
  const subtotal = cart.reduce((sum, line) => sum + (line.product.price + line.product.extras.filter(e => line.extras.includes(e.name)).reduce((n,e)=>n+e.price,0)) * line.quantity, 0);
  const deliveryFee = customer.fulfillment === 'DELIVERY' ? settings?.deliveryFee ?? 0 : 0;
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
    const flavors = Object.entries(flavorMap).filter(([,quantity]) => quantity > 0).map(([name,quantity]) => ({ name, quantity }));
    const line: CartLine = { product: customizing, productId: customizing.id, quantity: qty, flavors, extras: extraNames, notes: lineNotes.trim() };
    setCart(prev => [...prev, line]); setCustomizing(null);
  };
  const setFlavorQty = (name: string, next: number) => {
    if (!customizing) return;
    const currentTotal = Object.values(flavorMap).reduce((a,b)=>a+b,0);
    const prior = flavorMap[name] ?? 0;
    if (next > prior && currentTotal >= qty * (customizing.unitCount ?? 1)) return;
    setFlavorMap(prev => ({ ...prev, [name]: Math.max(0,next) }));
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
      const scaled = line.flavors.map(flavor => ({
        ...flavor,
        quantity: Math.floor(flavor.quantity * target / currentTotal),
      }));
      let remainder = target - scaled.reduce((sum, flavor) => sum + flavor.quantity, 0);
      for (let i = 0; remainder > 0 && i < scaled.length; i += 1, remainder -= 1) {
        scaled[i].quantity += 1;
      }
      return { ...line, quantity: next, flavors: scaled.filter(flavor => flavor.quantity > 0) };
    }));
  };
  const submitOrder = () => {
    setOrderError('');
    if (!settings) return;
    if (!customer.customerName.trim() || customer.phone.replace(/\D/g,'').length < 8) { setOrderError('Informe seu nome e um telefone válido.'); return; }
    if (customer.fulfillment === 'DELIVERY' && customer.address.trim().length < 5) { setOrderError('Informe o endereço completo para entrega.'); return; }
    if (!settings.whatsappNumber.replace(/\D/g,'')) { setOrderError('A loja ainda não configurou o WhatsApp. Fale com a loja para concluir seu pedido.'); return; }
    const order: OrderInput = { ...customer, customerName: customer.customerName.trim(), phone: customer.phone.trim(), address: customer.address.trim(), reference: customer.reference.trim(), notes: customer.notes.trim(), items: cart.map(({ product: _product, ...line }) => line) };
    createOrder.mutate({ data: order }, {
      onSuccess: (saved) => {
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
        const details = [
          `Pedido #${saved.id} — ${settings.name}`,
          `Cliente: ${saved.customerName}`,
          `Telefone: ${saved.phone}`,
          `Tipo: ${saved.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'}`,
          ...(saved.fulfillment === 'DELIVERY' ? [`Endereço: ${saved.address}`, saved.reference ? `Referência: ${saved.reference}` : []] : []),
          `Pagamento: ${saved.paymentMethod === 'PIX' ? 'PIX' : saved.paymentMethod === 'CASH' ? 'Dinheiro' : 'Cartão na entrega'}`,
          '',
          ...saved.items.map(item => `${item.quantity} × ${item.name}${item.flavors?.length ? ` — ${item.flavors.map(f=>`${f.quantity} ${f.name}`).join(', ')}` : ''}${item.extras?.length ? ` — adicionais: ${item.extras.map(e=>e.name).join(', ')}` : ''}${item.notes ? ` — obs.: ${item.notes}` : ''} — ${money(item.subtotal)}`),
          '',
          `Subtotal: ${money(saved.subtotal)}`,
          `Entrega: ${money(saved.deliveryFee)}`,
          `Total: ${money(saved.total)}`,
          saved.notes ? `Observações do pedido: ${saved.notes}` : '',
        ].filter(Boolean).join('\n');
        const phone = settings.whatsappNumber.replace(/\D/g,'');
        window.location.assign(`https://wa.me/${phone}?text=${encodeURIComponent(details)}`);
        setCart([]); setCheckout(false);
      },
      onError: () => setOrderError('Não foi possível salvar seu pedido. Confira a conexão e tente novamente.'),
    });
  };
  if (storeQuery.isLoading) return <main className="shell page-enter"><div className="topbar"><div className="brand-mark">L</div><span className="pill">CARREGANDO CARDÁPIO</span></div><div className="hero"><div><div className="panel" style={{height:220}}/><div className="panel" style={{height:30,marginTop:18}}/></div><div className="panel" style={{height:280}}/></div><div className="menu-grid">{[1,2,3,4].map(i=><div className="panel" style={{height:135}} key={i}/>)}</div></main>;
  if (storeQuery.isError) return <main className="shell" style={{paddingTop:50}}><div className="error-box"><strong>O cardápio não carregou.</strong><p>Tente novamente em instantes.</p><button className="btn" onClick={()=>storeQuery.refetch()}>Tentar de novo</button></div></main>;
  return <main className="grain page-enter">
    <div className="shell">
      <header className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:11}}>{settings?.logoUrl ? <img src={settings.logoUrl} alt="" className="brand-mark" style={{objectFit:'cover'}}/> : <div className="brand-mark">{(settings?.name ?? 'L').slice(0,1).toUpperCase()}</div>}<div><strong data-testid="text-store-name">{settings?.name ?? 'Lanche da Casa'}</strong><div className="tiny">{settings?.tagline || 'Feito na hora, do nosso jeito'}</div></div></div>
        <Link href="/admin" className="tiny" style={{textDecoration:'none'}}>Área da loja <ArrowRight size={14} style={{verticalAlign:'middle'}} /></Link>
      </header>
      <section className="hero">
        <div>
          <span className="pill" style={{background:'hsl(var(--accent))',color:'white'}}>LANCHES COM CARINHO</span>
          <h1 className="serif" style={{fontSize:58,lineHeight:.99,letterSpacing:'-.04em',margin:'18px 0 14px',maxWidth:540}}>Seu intervalo<br/>merece <span style={{color:'hsl(var(--primary))'}}>algo bom.</span></h1>
          <p style={{fontSize:16,lineHeight:1.65,color:'hsl(var(--muted-foreground))',maxWidth:410,margin:'0 0 20px'}}>{settings?.tagline || 'Crepes, pastéis e batatas feitos na hora. Escolha o seu e peça pelo WhatsApp.'}</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><span className="pill"><Clock3 size={14} style={{verticalAlign:'middle',marginRight:5}}/>Preparado na hora</span><span className="pill">Entrega {money(settings?.deliveryFee ?? 0)}</span></div>
        </div>
        <div className="hero-visual" aria-label="Ilustração de um crepe dourado"><span className="sun-tag">QUENTINHO E FRESCO</span><div className="food-plate"/></div>
      </section>
      <div className="section-head"><div><div className="tiny" style={{letterSpacing:'.12em'}}>ESCOLHA SEU FAVORITO</div><h2 className="serif" style={{fontSize:32,margin:'3px 0'}}>Nosso cardápio</h2></div><span className="tiny">{visible.length} opções</span></div>
      <nav className="categories">
        {[['ALL','Tudo'],...categoryOptions.map(c=>[c,categoryName[c]])].map(([key,label])=><button key={key} className={`pill ${category===key?'btn':''}`} onClick={()=>setCategory(key)}>{label}</button>)}
      </nav>
      {visible.length ? <div className="menu-grid">{visible.map(product=><ProductCard key={product.id} product={product} onAdd={()=>beginCustomize(product)} />)}</div> : <div className="empty"><UtensilsCrossed size={27}/><h3 className="serif" style={{color:'hsl(var(--foreground))'}}>Ainda não tem nada por aqui</h3><p>Volte em breve para conferir as novidades.</p></div>}
      <footer style={{padding:'42px 0 105px',display:'flex',justifyContent:'space-between',borderTop:'1px solid hsl(var(--border))',marginTop:42}}><span><strong>{settings?.name}</strong><div className="tiny">{settings?.tagline}</div></span><span className="tiny">Feito para comer bem.</span></footer>
    </div>
    {cart.length>0 && <div className="cart-dock"><button className="btn" onClick={()=>setCheckout(true)}><span><ShoppingBag size={17} style={{verticalAlign:'middle',marginRight:9}}/> Ver sacola · {cart.reduce((n,l)=>n+l.quantity,0)} itens</span><span>{money(subtotal)} <ArrowRight size={16} style={{verticalAlign:'middle',marginLeft:7}}/></span></button></div>}
    {customizing && <div className="overlay" onClick={()=>setCustomizing(null)}><section className="sheet page-enter" onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><span className="tiny">{categoryName[customizing.category]}</span><h2 className="serif" style={{fontSize:29,margin:'4px 0'}}>{customizing.name}</h2><p className="tiny">{customizing.description}</p></div><button className="icon-btn" onClick={()=>setCustomizing(null)} aria-label="Fechar"><X size={18}/></button></div>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:'1px solid hsl(var(--border))'}}><span>Quantidade</span><div style={{display:'flex',alignItems:'center',gap:12}}><button className="icon-btn" aria-label="Diminuir quantidade" onClick={()=>changeCustomizeQty(qty-1)}><Minus size={16}/></button><b>{qty}</b><button className="icon-btn" aria-label="Aumentar quantidade" onClick={()=>changeCustomizeQty(qty+1)}><Plus size={16}/></button></div></div>
       {customizing.flavors.length>0 && <div><div className="label">{customizing.unitCount ? `Distribua os sabores · ${qty*customizing.unitCount} unidades` : 'Escolha os sabores'}</div>{customizing.flavors.map(flavor=><div key={flavor} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0'}}><span>{flavor}</span><div style={{display:'flex',alignItems:'center',gap:10}}><button className="icon-btn" aria-label={`Diminuir ${flavor}`} onClick={()=>setFlavorQty(flavor,(flavorMap[flavor]??0)-1)}><Minus size={14}/></button><b>{flavorMap[flavor]??0}</b><button className="icon-btn" aria-label={`Aumentar ${flavor}`} onClick={()=>setFlavorQty(flavor,(flavorMap[flavor]??0)+1)}><Plus size={14}/></button></div></div>)}<p className="tiny">Selecionados: {Object.values(flavorMap).reduce((a,b)=>a+b,0)} / {qty*(customizing.unitCount ?? 1)}</p>{customizeError&&<p className="error-box">{customizeError}</p>}</div>}
      {customizing.extras.length>0 && <div className="field-group"><div className="label">Quer adicionar algo?</div>{customizing.extras.map(extra=><label key={extra.name} style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}><span><input type="checkbox" checked={extraNames.includes(extra.name)} onChange={e=>setExtraNames(v=>e.target.checked?[...v,extra.name]:v.filter(x=>x!==extra.name))}/> {extra.name}</span><span>+ {money(extra.price)}</span></label>)}</div>}
      {(customizing.category===ProductCategory.BATATA || customizing.flavors.length===0) && <div className="field-group"><label className="label">Observações do item</label><textarea className="field" rows={2} placeholder="Ex.: sem molho, bem passado..." value={lineNotes} onChange={e=>setLineNotes(e.target.value)}/></div>}
       <button className="btn" style={{width:'100%',marginTop:12}} onClick={addCustomized} disabled={customizing.flavors.length>0&&Object.values(flavorMap).reduce((a,b)=>a+b,0)!==qty*(customizing.unitCount??1)}>Adicionar à sacola · {money((customizing.price + customizing.extras.filter(e=>extraNames.includes(e.name)).reduce((a,e)=>a+e.price,0))*qty)}</button>
    </section></div>}
    {checkout && <div className="overlay" onClick={()=>setCheckout(false)}><section className="sheet page-enter" onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="tiny">QUASE LÁ</span><h2 className="serif" style={{fontSize:30,margin:'2px 0 10px'}}>Sua sacola</h2></div><button className="icon-btn" onClick={()=>setCheckout(false)}><X size={18}/></button></div>
       {cart.map((line,index)=><div key={index} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 0',borderTop:'1px solid hsl(var(--border))'}}><div style={{minWidth:0}}><b>{line.product.name}</b><div className="tiny">{[line.flavors.map(f=>`${f.quantity} ${f.name}`).join(', '),line.extras.join(', '),line.notes].filter(Boolean).join(' · ')}</div><div style={{display:'flex',alignItems:'center',gap:9,marginTop:8}}><button className="icon-btn" aria-label={`Diminuir ${line.product.name}`} onClick={()=>setCartQuantity(index,line.quantity-1)} disabled={line.quantity<=1}><Minus size={13}/></button><b>{line.quantity}</b><button className="icon-btn" aria-label={`Aumentar ${line.product.name}`} onClick={()=>setCartQuantity(index,line.quantity+1)}><Plus size={13}/></button></div></div><div style={{textAlign:'right',whiteSpace:'nowrap'}}>{money((line.product.price+line.product.extras.filter(e=>line.extras.includes(e.name)).reduce((a,e)=>a+e.price,0))*line.quantity)}<button className="icon-btn" aria-label={`Remover ${line.product.name}`} style={{marginLeft:8,display:'inline-grid',width:30,height:30}} onClick={()=>setCart(c=>c.filter((_,i)=>i!==index))}><Trash2 size={14}/></button></div></div>)}
      <div style={{display:'flex',gap:8,margin:'12px 0'}}><button className={`pill ${customer.fulfillment==='DELIVERY'?'btn':''}`} onClick={()=>setCustomer(c=>({...c,fulfillment:'DELIVERY'}))}>Entrega</button><button className={`pill ${customer.fulfillment==='PICKUP'?'btn':''}`} onClick={()=>setCustomer(c=>({...c,fulfillment:'PICKUP'}))}>Retirada</button></div>
      <div className="field-group"><label className="label">Seu nome</label><input className="field" value={customer.customerName} onChange={e=>setCustomer(c=>({...c,customerName:e.target.value}))} placeholder="Como podemos chamar você?"/></div>
      <div className="field-group"><label className="label">WhatsApp / telefone</label><input className="field" inputMode="tel" value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} placeholder="(11) 99999-9999"/></div>
      {customer.fulfillment==='DELIVERY' && <><div className="field-group"><label className="label">Endereço completo</label><input className="field" value={customer.address} onChange={e=>setCustomer(c=>({...c,address:e.target.value}))} placeholder="Rua, número, bairro e cidade"/></div><div className="field-group"><label className="label">Referência (opcional)</label><input className="field" value={customer.reference} onChange={e=>setCustomer(c=>({...c,reference:e.target.value}))} placeholder="Portão, bloco, ponto próximo"/></div></>}
      <div className="field-group"><label className="label">Forma de pagamento</label><select className="field" value={customer.paymentMethod} onChange={e=>setCustomer(c=>({...c,paymentMethod:e.target.value as typeof c.paymentMethod}))}><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão na entrega</option></select></div>
      <div className="field-group"><label className="label">Observações do pedido</label><textarea className="field" rows={2} value={customer.notes} onChange={e=>setCustomer(c=>({...c,notes:e.target.value}))} placeholder="Alguma orientação para a loja?"/></div>
      <div style={{borderTop:'1px solid hsl(var(--border))',paddingTop:12}}><SummaryRow label="Subtotal" value={money(subtotal)}/><SummaryRow label="Entrega" value={money(deliveryFee)}/><SummaryRow label="Total" value={money(total)} strong/></div>
      {orderError && <p className="error-box">{orderError}</p>}
      <button className="btn" style={{width:'100%',marginTop:14}} disabled={createOrder.isPending || cart.length===0} onClick={submitOrder}>{createOrder.isPending?'Salvando pedido...':'Confirmar e continuar no WhatsApp'} <ArrowRight size={16} style={{verticalAlign:'middle',marginLeft:6}}/></button>
      <p className="tiny" style={{textAlign:'center'}}>Seu pedido é salvo primeiro. Depois, você confirma os detalhes pelo WhatsApp.</p>
    </section></div>}
  </main>;
}

function SummaryRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}) { return <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontWeight:strong?700:400,fontSize:strong?18:14}}><span>{label}</span><span>{value}</span></div>; }
function ProductCard({product,onAdd}:{product:Product;onAdd:()=>void}) {
  return <article className="product-card" data-testid={`card-product-${product.id}`}>
    <div className="product-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> : <div className="photo-art"/>}</div>
    <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',minWidth:0}}><div><div style={{display:'flex',justifyContent:'space-between',gap:6}}><h3 style={{margin:'0 0 4px',fontSize:16}}>{product.name}</h3><b style={{whiteSpace:'nowrap',color:'hsl(var(--primary))'}}>{money(product.price)}</b></div><p className="tiny" style={{margin:'0 0 8px',lineHeight:1.4}}>{product.description}</p><div className="tiny">{product.unitCount ? `${product.unitCount} unidades` : product.flavors.length ? `${product.flavors.length} sabores` : 'Feito na hora'}</div></div><button className="btn btn-secondary" style={{alignSelf:'flex-start',padding:'8px 13px',fontSize:12,marginTop:8}} onClick={onAdd}>Escolher <Plus size={14} style={{verticalAlign:'middle',marginLeft:4}}/></button></div>
  </article>;
}

function Admin() {
  const status = useGetAdminStatus();
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [authError,setAuthError] = useState('');
  const setup = useSetupAdmin();
  const login = useLoginAdmin();
  const logout = useLogoutAdmin();
  const queryClient = useQueryClient();
  const [tab,setTab] = useState<'products'|'orders'|'settings'>('products');
  const [editing,setEditing] = useState<Product|null|false>(false);
  const adminProducts = useListAdminProducts({query:{enabled:!!status.data?.authenticated,queryKey:getListAdminProductsQueryKey()}});
  const adminOrders = useListAdminOrders({query:{enabled:!!status.data?.authenticated,queryKey:getListAdminOrdersQueryKey()}});
  const store = useGetStore();
  const saveStore = useUpdateStore();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [confirmDelete,setConfirmDelete] = useState<Product|null>(null);
  const [pageError,setPageError] = useState('');
  const refreshProducts = () => { queryClient.invalidateQueries({queryKey:getListAdminProductsQueryKey()}); queryClient.invalidateQueries({queryKey:getGetStoreQueryKey()}); };
  if (status.isLoading) return <div className="shell" style={{paddingTop:40}}><div className="panel" style={{height:180}}/></div>;
  if (status.isError) return <div className="shell" style={{paddingTop:40}}><div className="error-box">Não foi possível verificar o acesso.<p><button className="btn" onClick={()=>status.refetch()}>Tentar novamente</button></p></div></div>;
  if (!status.data?.authenticated) return <main className="grain" style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:18}}>
    <section className="panel page-enter" style={{width:'min(440px,100%)',padding:30}}>
      <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none',color:'inherit'}}><ArrowLeft size={15}/> Voltar para a loja</Link>
      <div className="brand-mark" style={{marginTop:26}}><UtensilsCrossed size={20}/></div>
      <div className="tiny" style={{marginTop:22,letterSpacing:'.12em'}}>PAINEL DA LOJA</div>
      <h1 className="serif" style={{fontSize:36,margin:'4px 0 8px'}}>{status.data?.setupRequired?'Seu primeiro acesso':'Que bom ter você de volta'}</h1>
      <p className="tiny" style={{fontSize:14,lineHeight:1.6}}>{status.data?.setupRequired?'Crie uma senha para proteger o painel e começar a organizar sua loja.':'Entre com sua senha para gerenciar cardápio e pedidos.'}</p>
      <form onSubmit={e=>{e.preventDefault();setAuthError('');if(password.length<8){setAuthError('A senha deve ter pelo menos 8 caracteres.');return;}if(status.data?.setupRequired && password!==confirm){setAuthError('As senhas não coincidem.');return;}const mutation=status.data?.setupRequired?setup:login;mutation.mutate({data:{password}},{onSuccess:()=>queryClient.invalidateQueries({queryKey:getGetAdminStatusQueryKey()}),onError:()=>setAuthError('Não foi possível autenticar. Verifique a senha e tente novamente.')});}}>
        <div className="field-group"><label className="label">Senha</label><input className="field" type="password" autoComplete={status.data?.setupRequired?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></div>
        {status.data?.setupRequired&&<div className="field-group"><label className="label">Confirme sua senha</label><input className="field" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8}/></div>}
        {authError&&<div className="error-box" style={{marginBottom:12}}>{authError}</div>}
        <button className="btn" style={{width:'100%'}} disabled={setup.isPending||login.isPending}>{setup.isPending||login.isPending?'Aguarde...':status.data?.setupRequired?'Criar senha e continuar':'Entrar no painel'}</button>
      </form>
    </section>
  </main>;
  return <div className="admin-wrap grain">
    <header className="admin-nav"><div style={{display:'flex',alignItems:'center',gap:12}}><div className="brand-mark" style={{background:'hsl(var(--background))',color:'hsl(var(--foreground))'}}><UtensilsCrossed size={19}/></div><div><strong>Central da loja</strong><div className="tiny" style={{color:'#c7bdb2'}}>Cardápio e pedidos, num só lugar</div></div></div><div style={{display:'flex',gap:10,alignItems:'center'}}><Link href="/" className="tiny" style={{color:'inherit',textDecoration:'none'}}>Ver loja</Link><button className="icon-btn" title="Sair" onClick={()=>logout.mutate(undefined,{onSuccess:()=>queryClient.invalidateQueries({queryKey:getGetAdminStatusQueryKey()})})}><LogOut size={16}/></button></div></header>
    <main className="admin-content page-enter">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:12,flexWrap:'wrap',marginBottom:23}}><div><div className="tiny" style={{letterSpacing:'.1em'}}>VISÃO GERAL</div><h1 className="serif" style={{fontSize:36,margin:'2px 0'}}>Bom trabalho.</h1></div><div className="pill">{adminOrders.data?.length??0} pedidos registrados</div></div>
      <nav className="categories" style={{paddingTop:0}}>{([['products','Produtos'],['orders','Pedidos'],['settings','Configurações']] as const).map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`pill ${tab===key?'btn':''}`}>{label}</button>)}</nav>
      {pageError&&<div className="error-box" style={{marginBottom:16}}>{pageError}</div>}
      {tab==='products'&&<section className="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14}}><div><h2 className="serif" style={{fontSize:26,margin:0}}>Seu cardápio</h2><span className="tiny">Edite os itens que seus clientes podem pedir.</span></div><button className="btn" onClick={()=>setEditing(null)}><Plus size={16} style={{verticalAlign:'middle',marginRight:5}}/>Novo produto</button></div>
        {adminProducts.isLoading?<div className="panel" style={{height:100}}/>:adminProducts.isError?<div className="error-box">Falha ao carregar produtos. <button className="btn" onClick={()=>adminProducts.refetch()}>Tentar de novo</button></div>:!adminProducts.data?.length?<div className="empty"><UtensilsCrossed/><h3 className="serif">Seu cardápio começa aqui</h3><p>Cadastre seu primeiro produto para começar a receber pedidos.</p><button className="btn" onClick={()=>setEditing(null)}>Adicionar produto</button></div>:<>
          <div className="table-row tiny" style={{fontWeight:700}}><span>PRODUTO</span><span>PREÇO</span><span>ATIVO</span><span>AÇÕES</span></div>
          {adminProducts.data.map(p=><div className="table-row" key={p.id}><div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}><div className="product-photo" style={{width:45,height:45,flex:'0 0 45px'}}>{p.imageUrl?<img src={p.imageUrl} alt=""/>:<div className="photo-art" style={{width:30,height:30}}/>}</div><div style={{minWidth:0}}><b>{p.name}</b><div className="tiny">{categoryName[p.category]}</div></div></div><span>{money(p.price)}</span><button className={`pill ${p.active?'':'btn-secondary'}`} onClick={()=>updateProduct.mutate({id:p.id,data:{...p,active:!p.active}},{onSuccess:refreshProducts,onError:()=>setPageError('Não foi possível atualizar o produto.')})}>{p.active?'Ativo':'Pausado'}</button><div style={{display:'flex',gap:6}}><button className="icon-btn" aria-label={`Editar ${p.name}`} onClick={()=>setEditing(p)}><ChevronDown size={16}/></button><button className="icon-btn" aria-label={`Excluir ${p.name}`} onClick={()=>setConfirmDelete(p)}><Trash2 size={15}/></button></div></div>)}
        </>}
      </section>}
      {tab==='orders'&&<section className="panel"><h2 className="serif" style={{fontSize:27,margin:'0 0 4px'}}>Pedidos recebidos</h2><p className="tiny">Acompanhe os pedidos registrados pelos clientes.</p>
        {adminOrders.isLoading?<div className="panel" style={{height:110}}/>:adminOrders.isError?<div className="error-box">Não foi possível carregar os pedidos. <button className="btn" onClick={()=>adminOrders.refetch()}>Tentar novamente</button></div>:!adminOrders.data?.length?<div className="empty"><ShoppingBag/><h3 className="serif">Nenhum pedido ainda</h3><p>Quando alguém finalizar um pedido, ele aparecerá aqui.</p></div>:<div style={{display:'grid',gap:12,marginTop:16}}>{[...adminOrders.data].sort((a,b)=>b.id-a.id).map(order=><details key={order.id} className="panel" style={{padding:16}}><summary style={{cursor:'pointer',display:'flex',justifyContent:'space-between',gap:10,listStyle:'none'}}><div><b>Pedido #{order.id} · {order.customerName}</b><div className="tiny">{new Date(order.createdAt).toLocaleString('pt-BR')} · {order.fulfillment==='DELIVERY'?'Entrega':'Retirada'}</div></div><b>{money(order.total)}</b></summary><div style={{borderTop:'1px solid hsl(var(--border))',marginTop:12,paddingTop:12}}><div className="tiny">Telefone: {order.phone} · Pagamento: {order.paymentMethod==='PIX'?'PIX':order.paymentMethod==='CASH'?'Dinheiro':'Cartão'}</div>{order.fulfillment==='DELIVERY'&&<p className="tiny">Endereço: {order.address}{order.reference?` · ${order.reference}`:''}</p>}{order.items.map((line,i)=><p key={i} style={{fontSize:14,margin:'10px 0'}}><b>{line.quantity} × {line.name}</b> — {money(line.subtotal)}<div className="tiny">{line.flavors.map(f=>`${f.quantity} ${f.name}`).join(', ')}{line.extras.length?` · ${line.extras.map(e=>e.name).join(', ')}`:''}{line.notes?` · ${line.notes}`:''}</div></p>)}{order.notes&&<p className="tiny">Observações: {order.notes}</p>}</div></details>)}</div>}
      </section>}
      {tab==='settings'&&<StoreSettingsPanel store={store.data?.settings??null} isLoading={store.isLoading} onSave={data=>saveStore.mutate({data},{onSuccess:()=>{queryClient.invalidateQueries({queryKey:getGetStoreQueryKey()});setPageError('');},onError:()=>setPageError('Não foi possível salvar as configurações.')})} pending={saveStore.isPending}/>}
    </main>
    {editing!==false&&<ProductEditor product={editing} pending={createProduct.isPending||updateProduct.isPending} onClose={()=>setEditing(false)} onSave={data=>{setPageError('');const done=()=>{refreshProducts();setEditing(false);};if(editing)updateProduct.mutate({id:editing.id,data},{onSuccess:done,onError:()=>setPageError('Não foi possível salvar o produto.')});else createProduct.mutate({data},{onSuccess:done,onError:()=>setPageError('Não foi possível criar o produto.')});}}/>}
    {confirmDelete&&<div className="modal"><section className="modal-card"><div style={{display:'flex',justifyContent:'space-between'}}><h2 className="serif" style={{marginTop:0}}>Excluir produto?</h2><button className="icon-btn" onClick={()=>setConfirmDelete(null)}><X size={16}/></button></div><p>“{confirmDelete.name}” será removido do cardápio. Essa ação não pode ser desfeita.</p><div style={{display:'flex',justifyContent:'end',gap:8}}><button className="btn btn-secondary" onClick={()=>setConfirmDelete(null)}>Cancelar</button><button className="btn" disabled={deleteProduct.isPending} onClick={()=>deleteProduct.mutate({id:confirmDelete.id},{onSuccess:()=>{refreshProducts();setConfirmDelete(null);},onError:()=>{setPageError('Não foi possível excluir o produto.');setConfirmDelete(null);}})}>{deleteProduct.isPending?'Excluindo...':'Excluir produto'}</button></div></section></div>}
  </div>;
}

function StoreSettingsPanel({store,isLoading,onSave,pending}:{store:StoreInput|null;isLoading:boolean;onSave:(data:StoreInput)=>void;pending:boolean}) {
  const [form,setForm] = useState<StoreInput|null>(null);
  const current = form ?? store;
  if(isLoading) return <section className="panel" style={{height:250}}/>;
  if(!current) return <section className="panel"><p>Não foi possível carregar as configurações.</p></section>;
  return <section className="panel"><h2 className="serif" style={{fontSize:27,margin:'0 0 5px'}}>Identidade da loja</h2><p className="tiny">Essas informações aparecem para seus clientes.</p><form onSubmit={e=>{e.preventDefault();onSave(current);}}>
    <div className="field-group"><label className="label">Nome da loja</label><input className="field" value={current.name} onChange={e=>setForm({...current,name:e.target.value})} required/></div>
    <div className="field-group"><label className="label">Frase da loja</label><input className="field" value={current.tagline} onChange={e=>setForm({...current,tagline:e.target.value})}/></div>
    <div className="field-group"><label className="label">Logo — URL da imagem</label><input className="field" value={current.logoUrl??''} onChange={e=>setForm({...current,logoUrl:e.target.value||null})} placeholder="https://..."/></div>
    <div className="field-group"><label className="label">WhatsApp com código do país</label><input className="field" inputMode="tel" value={current.whatsappNumber} onChange={e=>setForm({...current,whatsappNumber:e.target.value})} placeholder="5511999999999" required/></div>
    <div className="field-group"><label className="label">Taxa de entrega (R$)</label><input className="field" type="number" min="0" step="0.01" value={current.deliveryFee} onChange={e=>setForm({...current,deliveryFee:Number(e.target.value)})}/></div>
    <button className="btn" disabled={pending}>{pending?'Salvando...':'Salvar configurações'}</button>
  </form></section>;
}

function ProductEditor({product,pending,onClose,onSave}:{product:Product|null;pending:boolean;onClose:()=>void;onSave:(data:ProductInput)=>void}) {
  const [name,setName]=useState(product?.name??'');
  const [description,setDescription]=useState(product?.description??'');
  const [price,setPrice]=useState(product?.price??0);
  const [imageUrl,setImageUrl]=useState(product?.imageUrl??'');
  const [category,setCategory]=useState<ProductInput['category']>(product?.category??ProductCategory.CREPES);
  const [active,setActive]=useState(product?.active??true);
  const [unitCount,setUnitCount]=useState(product?.unitCount??0);
  const [flavors,setFlavors]=useState((product?.flavors??[]).join(', '));
  const [extras,setExtras]=useState((product?.extras??[]).map(e=>`${e.name}: ${e.price}`).join('\n'));
  const [validation,setValidation]=useState('');
  return <div className="modal"><section className="modal-card page-enter"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="tiny">CARDÁPIO</span><h2 className="serif" style={{fontSize:29,margin:'2px 0 15px'}}>{product?'Editar produto':'Novo produto'}</h2></div><button className="icon-btn" onClick={onClose}><X size={17}/></button></div>
    <form onSubmit={e=>{e.preventDefault();setValidation('');if(!name.trim()){setValidation('O nome do produto é obrigatório.');return;}const extraList=extras.split('\n').map(row=>{const [extraName,...priceParts]=row.split(':');return {name:extraName.trim(),price:Number(priceParts.join(':').replace(',','.').trim())};}).filter(x=>x.name);onSave({name:name.trim(),description,price:Number(price),imageUrl:imageUrl.trim()||null,category,active,unitCount:unitCount?Number(unitCount):null,flavors:flavors.split(',').map(x=>x.trim()).filter(Boolean),extras:extraList});}}>
      <div className="field-group"><label className="label">Nome</label><input className="field" value={name} onChange={e=>setName(e.target.value)} required/></div>
      <div className="field-group"><label className="label">Descrição</label><textarea className="field" rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div className="field-group"><label className="label">Preço (R$)</label><input className="field" type="number" min="0" step=".01" value={price} onChange={e=>setPrice(Number(e.target.value))}/></div><div className="field-group"><label className="label">Categoria</label><select className="field" value={category} onChange={e=>setCategory(e.target.value as ProductInput['category'])}>{categoryOptions.map(c=><option value={c} key={c}>{categoryName[c]}</option>)}</select></div></div>
      <div className="field-group"><label className="label">Foto — URL da imagem</label><input className="field" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="URL de imagem própria"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div className="field-group"><label className="label">Unidades por combo</label><input className="field" type="number" min="0" value={unitCount} onChange={e=>setUnitCount(Number(e.target.value))}/></div><label style={{display:'flex',alignItems:'center',gap:9,paddingTop:8}}><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Produto ativo</label></div>
      <div className="field-group"><label className="label">Sabores separados por vírgula</label><input className="field" value={flavors} onChange={e=>setFlavors(e.target.value)} placeholder="Queijo, Frango, Carne"/></div>
      <div className="field-group"><label className="label">Adicionais — um por linha no formato nome: preço</label><textarea className="field" rows={3} value={extras} onChange={e=>setExtras(e.target.value)} placeholder={'Cheddar: 3,50\nBacon: 4,00'}/></div>
      {validation&&<div className="error-box" style={{marginBottom:12}}>{validation}</div>}
      <div style={{display:'flex',justifyContent:'end',gap:9}}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn" disabled={pending}>{pending?'Salvando...':'Salvar produto'}</button></div>
    </form>
  </section></div>;
}

export default App;
