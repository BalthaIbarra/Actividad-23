// Opción 4 — Módulo de Registro y Autenticación de Usuarios (Actividad 23: API PHP + sesiones).
// Desacoplado: sin onclick/onsubmit en el HTML, todo se conecta acá vía addEventListener.

const LONGITUD_MINIMA_CLAVE = 8;

const NOMBRES_MEDIO_PAGO = {
  tarjeta_credito: 'Tarjeta de crédito',
  tarjeta_debito: 'Tarjeta de débito',
  transferencia: 'Transferencia bancaria',
  mercado_pago: 'Mercado Pago',
  efectivo: 'Efectivo contra entrega'
};

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.querySelector('#loginForm');
  if (formLogin) formLogin.addEventListener('submit', manejarEnvioLogin);

  const formRegistro = document.querySelector('#registroForm');
  if (formRegistro) formRegistro.addEventListener('submit', manejarEnvioRegistro);

  const botonLogout = document.querySelector('#btn-logout');
  if (botonLogout) botonLogout.addEventListener('click', cerrarSesion);

  const botonConfirmar = document.querySelector('#btn-confirmar');
  if (botonConfirmar) botonConfirmar.addEventListener('click', confirmarCompra);

  inicializarBuscador();
  verificarSesion();
});

// 200 = hay sesion, 401 = no
async function verificarSesion() {
  try {
    const respuesta = await fetch('api/mis_compras.php');

    if (respuesta.status === 401) {
      aplicarVistaSinSesion();
      return;
    }
    if (!respuesta.ok) {
      throw new Error(`Respuesta HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();
    aplicarVistaConSesion(datos.usuario, datos.compras);
  } catch (error) {
    aplicarVistaSinSesion();
  }
}

function aplicarVistaConSesion(usuario, compras) {
  ocultar('#header-login');
  mostrar('#header-usuario');
  mostrar('#btn-logout');
  ponerTexto('#header-nombre', usuario.nombre);

  if (document.querySelector('#sesion-activa')) {
    document.querySelectorAll('.login-view, .registro-view').forEach((seccion) => seccion.classList.add('oculto'));
    mostrar('#sesion-activa');
    ponerTexto('#sesion-nombre', usuario.nombre);
  }

  if (document.querySelector('#btn-finalizar')) {
    mostrar('#btn-finalizar');
    ocultar('#aviso-login');
    document.querySelector('#nombre').value = usuario.nombre;
    document.querySelector('#email').value = usuario.email;
  }

  if (document.querySelector('#cuenta-panel')) {
    ocultar('#cuenta-sin-sesion');
    mostrar('#cuenta-panel');
    ponerTexto('#cuenta-nombre', usuario.nombre);
    ponerTexto('#cuenta-email', usuario.email);
    renderizarCompras(compras);
  }
}

function aplicarVistaSinSesion() {
  mostrar('#header-login');
  ocultar('#header-usuario');
  ocultar('#btn-logout');

  if (document.querySelector('#btn-finalizar')) {
    ocultar('#btn-finalizar');
    mostrar('#aviso-login');
  }

  if (document.querySelector('#cuenta-panel')) {
    ocultar('#cuenta-panel');
    mostrar('#cuenta-sin-sesion');
  }
}

async function cerrarSesion() {
  try {
    await fetch('api/logout.php', { method: 'POST' });
  } finally {
    window.location.href = 'index.html';
  }
}

async function manejarEnvioLogin(evento) {
  evento.preventDefault();

  const email = document.querySelector('#login_email').value.trim();
  const clave = document.querySelector('#login_password').value;
  const feedback = document.querySelector('#login-feedback');

  mostrarFeedback(feedback, 'Verificando credenciales...', 'pendiente');

  try {
    const respuesta = await fetch('api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: clave })
    });
    const resultado = await respuesta.json();

    if (respuesta.ok && resultado.estado === 'exito') {
      mostrarFeedback(feedback, `¡Bienvenida/o, ${resultado.usuario.nombre}! Redirigiendo a la compra...`, 'exito');
      setTimeout(() => {
        window.location.href = 'comprar.html';
      }, 1200);
    } else {
      mostrarFeedback(feedback, resultado.mensaje || 'Email o contraseña incorrectos.', 'error');
    }
  } catch (error) {
    mostrarFeedback(feedback, 'No se pudo conectar con el servidor. Intentá nuevamente.', 'error');
  }
}

async function manejarEnvioRegistro(evento) {
  evento.preventDefault();

  const nombre = document.querySelector('#registro_nombre').value.trim();
  const email = document.querySelector('#registro_email').value.trim();
  const clave = document.querySelector('#registro_password').value;
  const claveConfirmacion = document.querySelector('#registro_password_confirm').value;
  const feedback = document.querySelector('#registro-feedback');

  if (clave.length < LONGITUD_MINIMA_CLAVE) {
    mostrarFeedback(feedback, `La contraseña debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`, 'error');
    return;
  }

  if (clave !== claveConfirmacion) {
    mostrarFeedback(feedback, 'Las contraseñas no coinciden.', 'error');
    return;
  }

  mostrarFeedback(feedback, 'Creando cuenta...', 'pendiente');

  try {
    const respuesta = await fetch('api/registro.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre, email: email, password: clave })
    });
    const resultado = await respuesta.json();

    if (respuesta.ok && resultado.estado === 'exito') {
      mostrarFeedback(feedback, 'Cuenta creada. Redirigiendo a iniciar sesión...', 'exito');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    } else {
      mostrarFeedback(feedback, resultado.mensaje || 'No se pudo crear la cuenta.', 'error');
    }
  } catch (error) {
    mostrarFeedback(feedback, 'No se pudo crear la cuenta. Intentá nuevamente.', 'error');
  }
}

function renderizarCompras(compras) {
  const cuerpo = document.querySelector('#tabla-compras');
  cuerpo.replaceChildren();

  if (compras.length === 0) {
    mostrar('#sin-compras');
    return;
  }

  compras.forEach((compra) => {
    const fila = document.createElement('tr');
    fila.append(
      crearCelda(numeroComprobante(compra.id), 'name'),
      crearCelda(formatearFecha(compra.fecha)),
      crearCelda(compra.productos),
      crearCelda(NOMBRES_MEDIO_PAGO[compra.medio_pago] || compra.medio_pago),
      crearCelda(formatearPrecio(compra.total), 'price')
    );
    cuerpo.append(fila);
  });
}

async function confirmarCompra(evento) {
  evento.preventDefault();
  const feedback = document.querySelector('#compra-feedback');

  const items = [...document.querySelectorAll('input[data-producto]')].map((input) => ({
    producto_id: input.dataset.producto,
    cantidad: Number(input.value)
  }));

  mostrarFeedback(feedback, 'Registrando tu pedido...', 'pendiente');

  try {
    const respuesta = await fetch('api/mis_compras.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medio_pago: document.querySelector('#medio_pago').value,
        items: items
      })
    });

    if (respuesta.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resultado = await respuesta.json();
    if (!respuesta.ok || resultado.estado !== 'exito') {
      mostrarFeedback(feedback, resultado.mensaje || 'No se pudo registrar la compra.', 'error');
      return;
    }

    mostrarFeedback(feedback, '', '');
    completarTicket(resultado.compra);
    window.location.hash = 'pedido-confirmado';
  } catch (error) {
    mostrarFeedback(feedback, 'No se pudo conectar con el servidor. Intentá nuevamente.', 'error');
  }
}

function completarTicket(compra) {
  ponerTexto('#ticket-numero', `Comprobante N.° ${numeroComprobante(compra.id)}`);
  ponerTexto('#ticket-fecha', `Fecha: ${new Date().toLocaleDateString('es-AR')}`);
  ponerTexto('#ticket-cliente', `Cliente: ${compra.cliente}`);
  ponerTexto('#ticket-pago', `Medio de pago: ${NOMBRES_MEDIO_PAGO[compra.medio_pago]}`);

  const cuerpo = document.querySelector('#ticket-detalle');
  cuerpo.replaceChildren();

  compra.detalle.forEach((linea) => {
    const fila = document.createElement('tr');
    fila.append(
      crearCelda(linea.nombre),
      crearCelda(`x${linea.cantidad}`, 'qty'),
      crearCelda(formatearPrecio(linea.subtotal), 'amount')
    );
    cuerpo.append(fila);
  });

  const filaEnvio = document.createElement('tr');
  filaEnvio.append(crearCelda('Envío estándar'), crearCelda('—', 'qty'), crearCelda('$ 0', 'amount'));

  const filaTotal = document.createElement('tr');
  filaTotal.className = 'total';
  const celdaTexto = crearCelda('Total pagado');
  celdaTexto.colSpan = 2;
  filaTotal.append(celdaTexto, crearCelda(formatearPrecio(compra.total), 'amount'));

  cuerpo.append(filaEnvio, filaTotal);
}

function crearCelda(texto, clase) {
  const celda = document.createElement('td');
  celda.textContent = texto;
  if (clase) celda.className = clase;
  return celda;
}

function ponerTexto(selector, texto) {
  const elemento = document.querySelector(selector);
  if (elemento) elemento.textContent = texto;
}

function mostrar(selector) {
  const elemento = document.querySelector(selector);
  if (elemento) elemento.classList.remove('oculto');
}

function ocultar(selector) {
  const elemento = document.querySelector(selector);
  if (elemento) elemento.classList.add('oculto');
}

function numeroComprobante(id) {
  return String(id).padStart(7, '0');
}

function formatearPrecio(valor) {
  return '$ ' + Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

function formatearFecha(fechaMysql) {
  const [anio, mes, dia] = fechaMysql.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function mostrarFeedback(elemento, mensaje, tipo) {
  elemento.textContent = mensaje;
  elemento.className = 'form-feedback ' + tipo;
}

// Opción 3 — Buscador y Filtro de Catálogo en Tiempo Real.
// Carga el catálogo con fetch(), filtra en memoria con .filter() e inyecta
// el resultado en el DOM. En páginas sin catálogo, el buscador redirige.
let catalogoCompleto = [];

async function inicializarBuscador() {
  const input = document.querySelector('.search-bar input');
  if (!input) return;

  const grilla = document.querySelector('.product-grid');
  // excluimos la tabla de mi_cuenta.html
  const cuerpoTabla = document.querySelector('table.catalog:not(.compras) tbody');
  const hayCatalogoEnEstaPagina = grilla || cuerpoTabla;

  if (!hayCatalogoEnEstaPagina) {
    input.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter') return;
      evento.preventDefault();
      window.location.href = 'listado_box.html?q=' + encodeURIComponent(input.value.trim());
    });
    return;
  }

  try {
    catalogoCompleto = await obtenerProductos();
  } catch (error) {
    mostrarErrorCatalogo(grilla, cuerpoTabla);
    return;
  }

  const parametros = new URLSearchParams(window.location.search);
  const terminoInicial = parametros.get('q') || '';
  input.value = terminoInicial;
  filtrarYRenderizar(terminoInicial, grilla, cuerpoTabla);

  input.addEventListener('input', () => {
    filtrarYRenderizar(input.value, grilla, cuerpoTabla);
  });
}

async function obtenerProductos() {
  const respuesta = await fetch('data/productos.json');
  if (!respuesta.ok) {
    throw new Error(`Respuesta HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

function mostrarErrorCatalogo(grilla, cuerpoTabla) {
  const texto = 'No se pudo cargar el catálogo. Intentá recargar la página.';
  if (grilla) grilla.replaceChildren(crearElemento('p', 'form-feedback error', texto));
  if (cuerpoTabla) {
    const celda = crearElemento('td', '', texto);
    celda.colSpan = 4;
    const fila = document.createElement('tr');
    fila.append(celda);
    cuerpoTabla.replaceChildren(fila);
  }
}

function filtrarYRenderizar(termino, grilla, cuerpoTabla) {
  const texto = termino.trim().toLowerCase();
  const filtrados = catalogoCompleto.filter((producto) =>
    producto.nombre.toLowerCase().includes(texto)
  );
  renderizarCatalogo(filtrados, grilla, cuerpoTabla);
}

function renderizarCatalogo(productos, grilla, cuerpoTabla) {
  if (grilla) grilla.replaceChildren(...productos.map(crearTarjeta));
  if (cuerpoTabla) cuerpoTabla.replaceChildren(...productos.map(crearFila));
}

function crearTarjeta(producto) {
  const tarjeta = crearElemento('article', `product-card cat-${producto.categoriaSlug}`);

  const imagen = document.createElement('img');
  imagen.src = producto.imagen;
  imagen.alt = producto.nombre;

  const acciones = crearElemento('div', 'card-actions');
  if (producto.detalle) {
    acciones.append(
      crearEnlace('producto.html', 'btn btn-outline', 'Ver detalle'),
      crearEnlace('comprar.html', 'btn btn-primary', 'Agregar')
    );
  } else {
    acciones.append(crearEnlace('comprar.html', 'btn btn-primary btn-block', 'Agregar al carrito'));
  }

  const cuerpo = crearElemento('div', 'body');
  cuerpo.append(
    crearElemento('div', 'category', producto.categoria),
    crearElemento('h2', '', producto.nombre),
    crearElemento('div', 'price small', producto.precioTexto),
    crearElemento('div', 'stock', `Stock: ${producto.stock} unidades`),
    acciones
  );

  tarjeta.append(imagen, cuerpo);
  return tarjeta;
}

function crearFila(producto) {
  const fila = crearElemento('tr', `cat-row cat-${producto.categoriaSlug}`);
  const stock = document.createElement('td');
  stock.append(crearElemento('span', producto.stockBajo ? 'stock-pill low' : 'stock-pill', `${producto.stock} unidades`));

  fila.append(
    crearElemento('td', 'name', producto.nombre),
    crearElemento('td', '', producto.categoria),
    crearElemento('td', 'price', producto.precioTexto),
    stock
  );
  return fila;
}

function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function crearEnlace(href, clase, texto) {
  const enlace = crearElemento('a', clase, texto);
  enlace.href = href;
  return enlace;
}
