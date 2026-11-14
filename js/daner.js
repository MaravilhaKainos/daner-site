/* ==========================================================================
   DANER ENERGIAS - Comportamento do site
   Depende de: jQuery, Bootstrap, Slick (carrossel de logos),
   Fancybox (vídeo e ampliação de fotos) e AOS (animações ao fazer scroll).
   ========================================================================== */
$(function () {
  // Número de WhatsApp da Daner, só dígitos, com indicativo de Angola (244).
  // TODO: substituir pelo número real antes de publicar.
  var WA = "244931849000";

  // --- Vídeo institucional e ampliação de fotos ----------------------------
  Fancybox.bind("[data-fancybox]", { Carousel: { Video: { autoplay: true } } });

  // --- Animações ao fazer scroll (atributos data-aos no HTML) --------------
  // O bloco anima quando já tem cerca de 80 px visíveis em baixo do ecrã (não espera pelo centro).
  // Desactiva-se para quem tem "reduzir movimento" activo no sistema.
  AOS.init({
    duration: 600,
    once: true,
    offset: 80,
    anchorPlacement: "top-bottom",
    disable: function () {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
  });

  // O carrossel de logos, as imagens e as fontes mudam a altura da página depois de o AOS medir
  // os blocos. Sempre que a altura da página muda, as posições são medidas de novo; assim as
  // animações disparam no sítio certo, e não tarde ou cedo demais.
  var aosTimer;
  new ResizeObserver(function () {
    clearTimeout(aosTimer);
    aosTimer = setTimeout(function () {
      AOS.refresh();
    }, 120);
  }).observe(document.body);

  // --- Carrossel de logos de clientes --------------------------------------
  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $(".client-logos").slick({
    slidesToShow: 5,
    slidesToScroll: 1,
    infinite: true,
    autoplay: !semMovimento,
    autoplaySpeed: 1500,
    arrows: false,
    dots: false,
    pauseOnHover: true,
    accessibility: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 3, autoplaySpeed: 2500 } },
    ],
  });

  // --- Números animados (Quem somos) ---------------------------------------
  // Conta de 0 até ao valor de data-count. data-suffix define o sufixo
  // (por omissão "+"; use data-suffix="" para não mostrar nada).
  function animateCounter($el) {
    var target = parseInt($el.data("count"), 10) || 0;
    var suffix = $el.data("suffix");
    if (suffix === undefined) suffix = "+";

    $({ n: 0 }).animate(
      { n: target },
      {
        duration: 2000,
        easing: "swing",
        step: function () {
          $el.text(Math.floor(this.n) + suffix);
        },
        complete: function () {
          $el.text(target + suffix);
        },
      },
    );
  }

  // Só começa a contar quando o número aparece no ecrã.
  var counterObserver = new IntersectionObserver(
    function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter($(entry.target));
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 },
  );
  $(".count-up").each(function () {
    counterObserver.observe(this);
  });

  // --- Origem da visita ------------------------------------------------------
  // Guarda de onde veio o visitante (parâmetros UTM dos anúncios e das redes).
  // Vai no formulário e na mensagem de WhatsApp, para a equipa comercial saber.
  var params = new URLSearchParams(location.search);
  var origin = [params.get("utm_source"), params.get("utm_medium"), params.get("utm_campaign")]
    .filter(Boolean)
    .join("/");

  try {
    if (origin) sessionStorage.setItem("origem", origin);
    origin = sessionStorage.getItem("origem") || origin || "directo";
  } catch (e) {
    origin = origin || "directo";
  }

  var form = document.getElementById("pedido");
  if (form) form.origem.value = origin;

  // Links "Peça proposta" da página de serviços trazem ?servico=chave: o serviço fica já escolhido.
  var servicoPedido = params.get("servico");
  if (form && servicoPedido && form.servico) {
    var opcao = form.servico.querySelector('option[data-key="' + servicoPedido.replace(/\W/g, "") + '"]');
    if (opcao) opcao.selected = true;
  }

  // Menu do telemóvel: ao tocar num link para uma secção desta página, o menu lateral fecha.
  var menuLateral = document.getElementById("offcanvasNavbar");
  if (menuLateral && window.bootstrap) {
    menuLateral.querySelectorAll("a[href*='#']").forEach(function (a) {
      a.addEventListener("click", function () {
        var url = new URL(a.href, location.href);
        if (url.pathname === location.pathname) {
          bootstrap.Offcanvas.getOrCreateInstance(menuLateral).hide();
        }
      });
    });
  }

  // Página de serviços: na barra lateral, marca o serviço que está no ecrã.
  var ladoLinks = document.querySelectorAll(".serv-side-nav a[href^='#']");
  if (ladoLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          ladoLinks.forEach(function (a) {
            var activo = a.getAttribute("href") === "#" + e.target.id;
            a.classList.toggle("active", activo);
            if (activo) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ladoLinks.forEach(function (a) {
      var alvo = document.querySelector(a.getAttribute("href"));
      if (alvo) spy.observe(alvo);
    });
  }

  // --- Botão de WhatsApp com mensagem pré-preenchida -------------------------
  document.querySelectorAll("#wa, #wa-float").forEach(function (a) {
    a.href =
      "https://wa.me/" + WA + "?text=" + encodeURIComponent(a.dataset.msg + " [" + origin + "]");
  });

  // O botão flutuante esconde-se quando a secção de contactos ou o rodapé estão no ecrã,
  // porque aí o WhatsApp já aparece de outra forma.
  var waFloat = document.getElementById("wa-float");
  if (waFloat && "IntersectionObserver" in window) {
    var visiveis = 0;
    var waObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          visiveis += e.isIntersecting ? 1 : -1;
        });
        waFloat.classList.toggle("wa-float--hidden", visiveis > 0);
      },
      { threshold: 0.2 },
    );
    ["contactos"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) waObserver.observe(el);
    });
    var rodape = document.querySelector("footer");
    if (rodape) waObserver.observe(rodape);
  }

  // --- Página mais curta em telemóvel: "Ler mais", acordeões do rodapé e campo opcional
  var mqMobile = window.matchMedia("(max-width: 767.98px)");

  var whoToggle = document.querySelector(".who-toggle");
  if (whoToggle) {
    whoToggle.addEventListener("click", function () {
      var aberto = document.querySelector(".who-more").classList.toggle("open");
      whoToggle.setAttribute("aria-expanded", aberto);
      whoToggle.textContent = aberto ? whoToggle.dataset.less : whoToggle.dataset.more;
    });
  }

  var formMore = document.querySelector(".form-more");
  if (formMore) {
    formMore.addEventListener("click", function () {
      formMore.closest("form").classList.add("show-opt");
      var campo = document.querySelector('form [name="empresa"]');
      if (campo) campo.focus();
    });
  }

  // Cartões de serviço em telemóvel: texto recolhido a 3 linhas com "Ler mais"
  document.querySelectorAll(".why-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var caixa = btn.closest(".why-box");
      var aberto = caixa.classList.toggle("open");
      btn.setAttribute("aria-expanded", aberto);
      btn.textContent = aberto ? btn.dataset.less : btn.dataset.more;
    });
  });

  // --- Portefólio: filtro por categoria ---------------------------------------
  var chips = document.querySelectorAll(".port-chip");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var cat = chip.dataset.filter;
      chips.forEach(function (c) {
        var activo = c === chip;
        c.classList.toggle("active", activo);
        c.setAttribute("aria-pressed", activo);
      });
      document.querySelectorAll(".port-item").forEach(function (item) {
        item.hidden = !(cat === "todos" || item.dataset.cat === cat);
      });
      if (window.AOS) AOS.refresh();
    });
  });

  // --- Portefólio: ficha do projecto (modal) ----------------------------------
  // Os dados vêm do bloco <script id="port-data"> da página. As fotos abrem em ecrã inteiro (Fancybox).
  var dadosEl = document.getElementById("port-data");
  var modalEl = document.getElementById("portModal");
  if (dadosEl && modalEl && window.bootstrap) {
    var dados = JSON.parse(dadosEl.textContent);
    var corpo = document.getElementById("portModalBody");
    var modal = new bootstrap.Modal(modalEl);
    var esc = function (t) {
      return String(t).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };
    var linha = function (rotulo, valor) {
      return "<div><dt>" + esc(rotulo) + "</dt><dd>" + esc(valor) + "</dd></div>";
    };
    var abrirFicha = function (slug) {
      var p = dados.items[slug];
      var L = dados.lab;
      var fotos = p.fotos
        .map(function (src, i) {
          return (
            '<a href="' +
            src +
            '" data-fancybox="m-' +
            slug +
            '" data-caption="' +
            esc(p.nome) +
            '" class="port-photo' +
            (i === 0 ? " port-photo-main" : "") +
            '"><img src="' +
            (i === 0 ? src : p.thumbs[i]) +
            '" alt="' +
            esc(p.nome) +
            '" /></a>'
          );
        })
        .join("");
      corpo.innerHTML =
        '<div class="port-sheet"><div class="port-photos' +
        (p.fotos.length === 1 ? " single" : "") +
        '">' +
        fotos +
        '</div><div class="port-info"><span class="proj-chip static">' +
        esc(p.cat) +
        '</span><h2 id="portModalTitle">' +
        esc(p.nome) +
        '</h2><p class="port-loc"><i class="bi bi-geo-alt"></i> ' +
        esc(p.loc) +
        '</p><span class="port-draft">' +
        esc(L.draft) +
        "</span><h3>" +
        esc(L.sheet) +
        "</h3><dl>" +
        linha(L.year, p.ano) +
        linha(L.serv, p.serv) +
        linha(L.gas, p.gas) +
        linha(L.inst, p.inst) +
        linha(L.data, p.data) +
        linha(L.time, p.time) +
        '</dl></div></div><div class="port-story"><div><h4>' +
        esc(L.ch) +
        "</h4><p>" +
        esc(p.ch) +
        "</p></div><div><h4>" +
        esc(L.sol) +
        "</h4><p>" +
        esc(p.sol) +
        "</p></div><div><h4>" +
        esc(L.res) +
        "</h4><p>" +
        esc(p.res) +
        '</p></div></div><a href="' +
        (document.documentElement.lang === "en" ? "index.html" : "index.html") +
        '#pedido" class="btn-cta-primary port-cta-btn"><span class="btn-text">' +
        esc(L.cta) +
        '</span><i class="bi bi-arrow-right-circle-fill btn-icon-primary"></i></a>';
      modal.show();
    };
    // Ao fechar a ficha (Esc, botão ou clique fora), o foco volta ao cartão que a abriu.
    var gatilho = null;
    modalEl.addEventListener("hidden.bs.modal", function () {
      if (gatilho) gatilho.focus();
    });
    document.querySelectorAll(".port-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        e.preventDefault();
        gatilho = card;
        abrirFicha(card.dataset.project);
      });
    });
  }

  // --- Slider do hero: botão de pausa e respeito por "reduzir movimento" -------
  var heroEl = document.getElementById("carouselKenBurns");
  var heroBtn = document.querySelector(".hero-pause");
  if (heroEl && heroBtn && window.bootstrap) {
    var hero = bootstrap.Carousel.getOrCreateInstance(heroEl);
    var heroParado = false;
    var defineHero = function (parado) {
      heroParado = parado;
      heroEl.classList.toggle("hero-paused", parado);
      heroBtn.setAttribute("aria-pressed", parado ? "true" : "false");
      var rotulo = parado ? heroBtn.dataset.labelPlay : heroBtn.dataset.labelPause;
      heroBtn.setAttribute("aria-label", rotulo);
      heroBtn.firstElementChild.className = parado ? "bi bi-play-fill" : "bi bi-pause-fill";
      if (parado) hero.pause();
      else hero.cycle();
    };
    heroBtn.addEventListener("click", function () {
      defineHero(!heroParado);
    });
    // O Bootstrap retoma o slider quando o rato sai; se o visitante o pausou, mantém-se parado.
    heroEl.addEventListener("mouseleave", function () {
      if (heroParado) hero.pause();
    });
    if (semMovimento) defineHero(true);
  }

  // Faixa de sectores em telemóvel: é deslizável, por isso tem de se alcançar pelo teclado.
  var sectorList = document.querySelector(".sector-list");
  if (sectorList) {
    var ajustaSectores = function () {
      if (mqMobile.matches) {
        sectorList.setAttribute("tabindex", "0");
        sectorList.setAttribute("role", "region");
        sectorList.setAttribute(
          "aria-label",
          document.documentElement.lang === "en" ? "Sectors" : "Sectores",
        );
      } else {
        sectorList.removeAttribute("tabindex");
        sectorList.removeAttribute("role");
        sectorList.removeAttribute("aria-label");
      }
    };
    ajustaSectores();
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", ajustaSectores);
  }

  // Em ecrã grande o rodapé fica sempre aberto e o título não recolhe; em telemóvel começa fechado.
  var accs = document.querySelectorAll(".ft-acc");
  function ajustaRodape() {
    accs.forEach(function (d) {
      d.open = !mqMobile.matches;
    });
  }
  accs.forEach(function (d) {
    d.querySelector("summary").addEventListener("click", function (e) {
      if (!mqMobile.matches) e.preventDefault();
    });
  });
  ajustaRodape();
  if (mqMobile.addEventListener) mqMobile.addEventListener("change", ajustaRodape);

  // --- Formulário curto (nome, empresa, contacto, serviço, descrição) --------
  if (!form) return;

  // Botões "Peça avaliação técnica": levam ao formulário e, em computador, põem o cursor no
  // primeiro campo. Em telemóvel não, para não abrir o teclado sem o visitante o pedir.
  document.querySelectorAll('a[href="#pedido"]').forEach(function (a) {
    a.addEventListener("click", function () {
      if (!window.matchMedia("(hover: hover)").matches) return;
      setTimeout(function () {
        form.nome.focus({ preventScroll: true });
      }, 700);
    });
  });

  var status = form.querySelector(".status");

  // Aceita um e-mail ou um número de telefone (pelo menos 9 dígitos).
  function contactoValido(v) {
    v = v.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.replace(/\D/g, "").length >= 9;
  }

  // Envio: valida, manda os dados para php/pedido.php sem recarregar a página.
  form.onsubmit = function (e) {
    e.preventDefault();
    status.className = "status";
    status.textContent = "";

    // Campos obrigatórios em branco: o próprio navegador indica qual falta.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!contactoValido(form.contacto.value)) {
      form.contacto.setCustomValidity(form.dataset.inv);
      form.contacto.reportValidity();
      form.contacto.oninput = function () {
        form.contacto.setCustomValidity("");
      };
      return;
    }

    fetch(form.action, { method: "POST", body: new FormData(form) })
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        if (!json.ok) throw new Error("envio falhou");
        status.className = "status ok";
        status.textContent = form.dataset.ok;
        form.reset();
      })
      .catch(function () {
        status.className = "status err";
        status.textContent = form.dataset.err;
      });
  };
});

/* Carrossel de imagens (páginas de serviço): roda sozinho, com pausa */
(function () {
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var track = g.querySelector(".serv-gal-track");
    var slides = g.querySelectorAll(".serv-gal-slide");
    var dots = g.querySelector(".serv-gal-dots");
    var prev = g.querySelector('[data-dir="-1"]');
    var next = g.querySelector('[data-dir="1"]');
    var pauseBtn = g.querySelector("[data-pause-btn]");
    var cur = 0;
    var timer = null;
    var userPaused = reduz; // com movimento reduzido não roda sozinho
    var hover = false;
    var visible = false;
    slides.forEach(function () {
      dots.appendChild(document.createElement("span"));
    });
    function paint() {
      cur = Math.round(track.scrollLeft / track.clientWidth);
      cur = Math.max(0, Math.min(slides.length - 1, cur));
      dots.querySelectorAll("span").forEach(function (d, i) {
        d.className = i === cur ? "is-on" : "";
      });
      prev.disabled = cur === 0;
      next.disabled = cur === slides.length - 1;
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth });
    }
    function paintPause() {
      var icon = pauseBtn.querySelector("i");
      var label = userPaused ? g.dataset.play : g.dataset.pause;
      pauseBtn.setAttribute("aria-label", label);
      icon.className = "bi " + (userPaused ? "bi-play-fill" : "bi-pause-fill");
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }
    function start() {
      stop();
      if (userPaused || hover || !visible || document.hidden) return;
      timer = window.setInterval(function () {
        go(cur === slides.length - 1 ? 0 : cur + 1);
      }, 4500);
    }
    prev.addEventListener("click", function () {
      go(cur - 1);
      start();
    });
    next.addEventListener("click", function () {
      go(cur + 1);
      start();
    });
    pauseBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      paintPause();
      start();
    });
    track.addEventListener("scroll", function () {
      window.requestAnimationFrame(paint);
    });
    track.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        go(cur + 1);
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        go(cur - 1);
      }
    });
    g.addEventListener("mouseenter", function () {
      hover = true;
      stop();
    });
    g.addEventListener("mouseleave", function () {
      hover = false;
      start();
    });
    g.addEventListener("focusin", function () {
      hover = true;
      stop();
    });
    g.addEventListener("focusout", function () {
      hover = false;
      start();
    });
    document.addEventListener("visibilitychange", start);
    window.addEventListener("resize", function () {
      track.style.scrollBehavior = "auto";
      go(cur);
      track.style.scrollBehavior = "";
    });
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        start();
      },
      { threshold: 0.4 },
    ).observe(g);
    paint();
    paintPause();
  });
})();
