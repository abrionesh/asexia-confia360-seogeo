import {
  CalendarEvent,
  CatalogItem,
  ClientMasterRecord,
  ConfiaModuleId,
  DirectoryListing,
  EcosystemBridgeItem,
  GbpProfileAudit,
  GeoGridNode,
  InvitationWebhookConfig,
  MediaCampaign,
  ModuleReleaseNote,
  ProactiveAlert,
  ProactiveSeoSuggestion,
  ProjectWorkspace,
  ReputationCompetitorBenchmark,
  ReputationKpiPoint,
  ReputationSourceDefinition,
  ReputationSourcePlatform,
  ReviewAutomationPolicy,
  ReviewIncidentCase,
  ReviewInvitation,
  SeasonalAction,
  StoreState,
  WeatherSnapshot,
} from '../types';

export const CORE_REPUTATION_SOURCES: ReputationSourcePlatform[] = [
  'Google Business Profile',
  'Trustpilot',
  'TripAdvisor',
  'Doctoralia',
  'Habitissimo',
];

export const SOCIAL_REPUTATION_SOURCES: ReputationSourcePlatform[] = [
  'Meta (Instagram/Facebook)',
  'TikTok',
  'YouTube',
];

export const ALL_REPUTATION_SOURCES: ReputationSourcePlatform[] = [
  ...CORE_REPUTATION_SOURCES,
  ...SOCIAL_REPUTATION_SOURCES,
];

export const DEFAULT_REPUTATION_SOURCE_CATALOG: ReputationSourceDefinition[] = [
  {
    id: 'src-gbp',
    name: 'Google Business Profile',
    label: 'Google Maps (GBP)',
    detail: 'Fichas locales, Maps y Q&A',
    category: 'base',
    isDefault: true,
  },
  {
    id: 'src-trustpilot',
    name: 'Trustpilot',
    label: 'Trustpilot',
    detail: 'Opiniones de servicio y confianza',
    category: 'base',
    isDefault: true,
  },
  {
    id: 'src-tripadvisor',
    name: 'TripAdvisor',
    label: 'TripAdvisor',
    detail: 'Experiencias, hostelería y visitas',
    category: 'sectorial',
    isDefault: true,
  },
  {
    id: 'src-doctoralia',
    name: 'Doctoralia',
    label: 'Doctoralia',
    detail: 'Clínicas, salud y especialistas',
    category: 'sectorial',
    isDefault: true,
  },
  {
    id: 'src-habitissimo',
    name: 'Habitissimo',
    label: 'Habitissimo',
    detail: 'Presupuestos y servicios locales',
    category: 'sectorial',
    isDefault: true,
  },
  {
    id: 'src-meta',
    name: 'Meta (Instagram/Facebook)',
    label: 'Meta (Instagram / Facebook)',
    detail: 'Comentarios críticos en Reels y posts',
    category: 'social',
    isDefault: true,
  },
  {
    id: 'src-tiktok',
    name: 'TikTok',
    label: 'TikTok',
    detail: 'Dudas urgentes y críticas en vídeo',
    category: 'social',
    isDefault: true,
  },
  {
    id: 'src-youtube',
    name: 'YouTube',
    label: 'YouTube',
    detail: 'Comentarios negativos en canal',
    category: 'social',
    isDefault: true,
  },
];

export function createDefaultClientMaster(params: {
  companyName: string;
  domain: string;
  city: string;
  sector: string;
  plan?: 'Starter' | 'Growth' | 'Agency' | 'Enterprise';
  enabledModules?: ConfiaModuleId[];
  language?: string;
  country?: string;
}): ClientMasterRecord {
  const isValencia = params.city.toLowerCase().includes('valencia');
  const isAsexia = params.companyName.toLowerCase().includes('asexia');
  const cleanHost = params.domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || 'cliente.es';
  const plan = params.plan || (isAsexia ? 'Agency' : 'Growth');
  const modules = params.enabledModules || ['reputacion_local', 'seo_geo', 'campanas'];
  const monthlyPrice =
    plan === 'Enterprise' ? 490 : plan === 'Agency' ? 299 : plan === 'Growth' ? 129 : 49;

  const codeSuffix = isAsexia ? 'ASX-001' : isValencia ? 'VAL-002' : String(Date.now()).slice(-4);

  return {
    confiaCode: `C360-${codeSuffix}`,
    legalName: isAsexia
      ? 'AsexIA Transformación Digital S.L.'
      : isValencia
        ? 'Clínica Dental Confía Valencia S.L.P.'
        : `${params.companyName} S.L.`,
    commercialName: params.companyName,
    taxId: isAsexia ? 'B88421904' : isValencia ? 'B98765432' : 'B00000000',
    sector: params.sector,
    fiscalAddress: isValencia
      ? 'Gran Vía Marqués del Turia 42, Bajo'
      : isAsexia
        ? 'Calle Gran Vía 38, Planta 4'
        : `Calle Principal 12, ${params.city}`,
    postalCode: isValencia ? '46005' : '28013',
    city: params.city,
    country: params.country || 'España',
    primaryContactName: isValencia ? 'Dra. Beatriz Soler' : isAsexia ? 'Lucía Serrano' : 'Dirección General',
    primaryContactRole: isValencia ? 'Directora Médica y Propietaria' : 'Dirección de Operaciones',
    email: `administracion@${cleanHost}`,
    phone: isValencia ? '+34 960 214 890' : '+34 910 482 310',
    website: params.domain.startsWith('http') ? params.domain : `https://${params.domain}`,
    locations: isValencia
      ? ['Valencia · Eixample (Sede Central)', 'Valencia · Ruzafa']
      : isAsexia
        ? ['Madrid · Gran Vía (Sede Central)', 'Madrid · Chamberí']
        : [`${params.city} · Sede Principal`],
    accountStatus: 'Activo',
    accountManager: 'Lucía Serrano (Asexia)',
    onboardingDate: isAsexia ? '2026-03-15' : '2026-06-01',
    renewalDate: isAsexia ? '2027-03-15' : '2027-06-01',
    lastReviewDate: '2026-11-15',
    nextReviewDate: '2026-12-15',
    notes:
      'Ficha Única de Cliente con prioridad maestra en Confia360. Cualquier edición de identificación, módulos, cobros o políticas se propaga automáticamente al resto de vistas y conectores.',
    subscriptions: [
      {
        id: `sub-base-${codeSuffix.toLowerCase()}`,
        planName: `Suite Confia360 · Plan ${plan}`,
        modulesIncluded: modules,
        billingCycle: 'Mensual',
        amountEur: monthlyPrice,
        status: 'Activa',
        startDate: isAsexia ? '2026-03-15' : '2026-06-01',
        nextBillingDate: '2026-12-01',
        autoRenew: true,
      },
      {
        id: `sub-social-${codeSuffix.toLowerCase()}`,
        planName: 'Add-on Escucha Social (Meta, TikTok, YouTube)',
        modulesIncluded: ['reputacion_local'],
        billingCycle: 'Mensual',
        amountEur: 39,
        status: 'Activa',
        startDate: '2026-10-01',
        nextBillingDate: '2026-12-01',
        autoRenew: true,
      },
    ],
    payments: [
      {
        id: `pay-1-${codeSuffix.toLowerCase()}`,
        concept: `Cuota Octubre · Suite Confia360 ${plan}`,
        invoiceNumber: `FAC-2026-10-${codeSuffix}`,
        amountEur: monthlyPrice + 39,
        issueDate: '2026-10-01',
        dueDate: '2026-10-05',
        paidAt: '2026-10-03',
        paymentMethod: 'Domiciliación SEPA',
        status: 'Pagado',
      },
      {
        id: `pay-2-${codeSuffix.toLowerCase()}`,
        concept: `Cuota Noviembre · Suite Confia360 ${plan} + Add-on Social`,
        invoiceNumber: `FAC-2026-11-${codeSuffix}`,
        amountEur: monthlyPrice + 39,
        issueDate: '2026-11-01',
        dueDate: '2026-11-05',
        paidAt: isValencia ? undefined : '2026-11-04',
        paymentMethod: 'Domiciliación SEPA',
        status: isValencia ? 'Pendiente' : 'Pagado',
      },
      {
        id: `pay-3-${codeSuffix.toLowerCase()}`,
        concept: `Renovación Diciembre · Módulos Activos (${modules.length})`,
        invoiceNumber: `FAC-2026-12-${codeSuffix}`,
        amountEur: monthlyPrice + 39,
        issueDate: '2026-11-20',
        dueDate: '2026-12-05',
        paymentMethod: 'Domiciliación SEPA',
        status: 'Pendiente',
      },
    ],
    notificationEmail: `alertas@${cleanHost}`,
    billingEmail: `facturacion@${cleanHost}`,
    preferredLanguage: params.language || 'es-ES',
    confiaSync: {
      confiaClientId: `confia360-cli-${codeSuffix.toLowerCase()}`,
      apiEndpointUrl: '/api/v1/confia360/clients/webhook',
      syncStatus: 'Sincronizado',
      lastSyncedAt: '2026-11-21 08:30',
      lastSyncDirection: 'Bidireccional',
      syncedModulesSummary: `${modules.length} módulos base + Ficha Única + Escucha Social + Tutor Gemini`,
      priorityMode: 'Ficha Maestra Prioritaria',
    },
    updatedAt: '2026-11-21 08:30',
  };
}

export const DEFAULT_RELEASE_NOTES: ModuleReleaseNote[] = [
  {
    id: 'rn-ficha-confia360',
    version: 'v2.4',
    title: 'Nueva Ficha Única de Cliente Confia360 con Cuadro de Control Visual',
    summary:
      'Centraliza identificación fiscal, suscripciones en curso, fechas de pagos pendientes y configuración global propagada con prioridad a todos los módulos.',
    details:
      'Ahora puedes consultar el cuadro de control financiero y contractual, registrar o liquidar pagos pendientes, editar datos maestros del cliente y lanzar la sincronización API bidireccional con el ecosistema Confia360 desde una sola pantalla.',
    modules: ['client', 'dashboard', 'onboarding'],
    category: 'Nueva función',
    publishedAt: '2026-11-21',
    publishedBy: 'Admin Asexia',
    active: true,
  },
  {
    id: 'rn-reputacion-omnicanal',
    version: 'v2.3',
    title: 'KPIs D3 de Reputación, Buzón Omnicanal y Add-on de Escucha Social',
    summary:
      'Nuevo panel D3 comparativo frente a competidores locales y centralización de críticas en Meta, TikTok, YouTube y portales sectoriales.',
    details:
      'El add-on de Escucha Social se activa por selectores múltiples protegidos por PIN en Onboarding y Administración y enruta cualquier crítica negativa directamente al buzón unificado e Incidencias SLA sin mezclar campañas de pago.',
    modules: ['reputation', 'onboarding'],
    category: 'Nueva función',
    publishedAt: '2026-11-21',
    publishedBy: 'Admin Asexia',
    active: true,
  },
  {
    id: 'rn-tutor-voz-gemini',
    version: 'v2.4',
    title: 'Tutor Contextual por Pantalla con Voz y Micrófono (Gemini)',
    summary:
      'Pulsa el botón “?” en la barra superior para escuchar la explicación de cualquier pantalla o preguntar hablando por micrófono.',
    details:
      'El tutor lee el contexto de la vista abierta y la Ficha Única de tu negocio para responder dudas operativas o sobre pagos, módulos y configuraciones tanto por texto como en audio.',
    modules: ['dashboard', 'geo-ai', 'geogrid', 'content', 'campaigns', 'calendar', 'technical', 'backlinks'],
    category: 'Integración',
    publishedAt: '2026-11-21',
    publishedBy: 'Admin Asexia',
    active: true,
  },
];

export function createDefaultReputationExtensions(
  companyName: string,
  domain: string,
  city: string,
  sector: string
): {
  enabledModules: ConfiaModuleId[];
  gbpAudit: GbpProfileAudit;
  invitationConfig: InvitationWebhookConfig;
  reviewInvitations: ReviewInvitation[];
  reviewIncidents: ReviewIncidentCase[];
  directoryListings: DirectoryListing[];
  socialListeningAddonEnabled: boolean;
  enabledReputationSources: ReputationSourcePlatform[];
  reputationSourcesCatalog: ReputationSourceDefinition[];
  reputationKpisTimeline: ReputationKpiPoint[];
  reputationCompetitors: ReputationCompetitorBenchmark[];
} {
  const isValencia = city.toLowerCase().includes('valencia');
  const cleanHost = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const masterAddress = isValencia
    ? 'Gran Vía Marqués del Turia 42, 46005 Valencia'
    : 'Calle Gran Vía 38, 28013 Madrid';
  const masterPhone = isValencia ? '+34 960 214 890' : '+34 910 482 310';

  const gbpAudit: GbpProfileAudit = {
    verified: true,
    primaryCategory: isValencia ? 'Clínica dental' : 'Consultoría de administración empresarial',
    secondaryCategories: isValencia
      ? ['Implantología dental', 'Ortodoncista', 'Dentista de urgencias']
      : ['Agencia de marketing digital', 'Servicio de seguridad informática', 'Asesoría empresarial'],
    completenessScore: isValencia ? 78 : 74,
    photosCount: isValencia ? 9 : 6,
    recommendedPhotosCount: 15,
    thirdPartyChangeAlert: isValencia
      ? 'Google sugirió cambio en horario de sábados (10:00–14:00) pendiente de confirmar.'
      : 'Detectada sugerencia de terceros en horario de viernes (cierre 18:00 en lugar de 19:00).',
    optimizedDescription: isValencia
      ? `${companyName}: clínica odontológica en ${city} Eixample especializada en implantología de carga inmediata, ortodoncia invisible y diagnóstico con TAC 3D y presupuesto cerrado.`
      : `${companyName}: consultoría en ${city} especializada en digitalización de pymes y autónomos, tramitación de ayudas Kit Digital, CRM trazable y visibilidad local medible.`,
    checklist: [
      {
        id: 'chk-1',
        category: 'Identidad y Categorías',
        title: 'Categoría principal y 3 categorías secundarias verificadas',
        detail: `Ficha reclamada y verificada en ${city} con categorías alineadas al catálogo.`,
        impact: 'Alto',
        autoFixable: true,
        status: 'Completado',
      },
      {
        id: 'chk-2',
        category: 'Horarios y Festivos',
        title: 'Configurar horarios especiales del Puente de Diciembre y Navidad',
        detail: 'Faltan los días festivos 6 y 8 de diciembre; Google muestra aviso de horario incierto.',
        impact: 'Alto',
        autoFixable: true,
        status: 'Pendiente',
        aiSuggestion: 'Marcar cerrado el 06/12 y 08/12 y horario continuo el 24/12 (09:30–14:00).',
      },
      {
        id: 'chk-3',
        category: 'Fotos y Medios',
        title: `Completar galería de servicios (${isValencia ? 9 : 6}/15 fotos recomendadas)`,
        detail: 'Faltan fotografías reales del equipo, exterior con señalética y detalle de servicio principal.',
        impact: 'Alto',
        autoFixable: false,
        status: 'Pendiente',
        aiSuggestion: `Subir 6 fotos geolocalizadas en ${city} mostrando atención al cliente y fachada.`,
      },
      {
        id: 'chk-4',
        category: 'Servicios y Atributos',
        title: 'Activar atributos de cita online y métodos de pago sin contacto',
        detail: 'Mejora la conversión en búsquedas móviles y respuestas locales de Gemini.',
        impact: 'Medio',
        autoFixable: true,
        status: 'Pendiente',
        aiSuggestion: 'Añadir atributo "Cita previa online" y enlace directo a reserva.',
      },
      {
        id: 'chk-5',
        category: 'Preguntas y Terceros',
        title: 'Responder 2 preguntas frecuentes abiertas en la ficha GBP',
        detail: 'Los usuarios preguntan plazos de diagnóstico y cobertura por código postal.',
        impact: 'Medio',
        autoFixable: true,
        status: 'Pendiente',
      },
    ],
    qas: isValencia
      ? [
          {
            id: 'qa-v1',
            question: '¿La primera valoración implantológica con TAC 3D tiene coste adicional?',
            answer:
              'La primera valoración diagnóstica se realiza con presupuesto cerrado por escrito antes de iniciar cualquier tratamiento.',
            source: 'Usuario GBP',
            status: 'Pendiente',
          },
          {
            id: 'qa-v2',
            question: '¿Atendéis urgencias dentales el mismo día en Valencia Eixample?',
            answer:
              'Sí, reservamos huecos diarios para urgencias en Gran Vía Marqués del Turia 42 previa llamada o WhatsApp.',
            source: 'Sugerida IA',
            status: 'Publicada',
          },
        ]
      : [
          {
            id: 'qa-1',
            question: '¿Tramitáis directamente la subvención del Kit Digital para pymes en Madrid?',
            answer: `Sí, en ${companyName} gestionamos el diagnóstico en 48 h y la implantación completa como Agente Digitalizador Adherido.`,
            source: 'Usuario GBP',
            status: 'Pendiente',
          },
          {
            id: 'qa-2',
            question: '¿Trabajáis con autónomos además de empresas de hasta 49 empleados?',
            answer:
              'Sí, adaptamos soluciones web, facturación y CRM desde autónomos (Segmento III) hasta pymes.',
            source: 'Sugerida IA',
            status: 'Publicada',
          },
        ],
    localPosts: [
      {
        id: 'post-gbp-1',
        type: 'Novedad',
        title: isValencia
          ? 'Diagnóstico digital 3D y planificación guiada en Valencia Eixample'
          : `Diagnóstico de visibilidad local en ${city} en 48 horas`,
        body: isValencia
          ? 'Evaluamos estabilidad ósea, plazos reales y presupuesto cerrado sin sorpresas en nuestra sede de Ruzafa / Eixample.'
          : `Revisamos tu ficha de Google, códigos postales clave en ${city} y puntos de fuga de leads sin permanencia oculta.`,
        ctaText: 'Reservar cita',
        scheduledDate: '2026-11-25',
        status: 'Aprobada',
      },
      {
        id: 'post-gbp-2',
        type: 'Oferta',
        title: isValencia
          ? 'Campaña Higiene + Revisión Preventiva Pre-Navidad'
          : 'Auditoría previa de requisitos Q4 para pymes y autónomos',
        body: isValencia
          ? 'Solicita revisión completa antes de diciembre con equipo colegiado en Valencia.'
          : 'Comprueba disponibilidad de presupuesto y hoja de ruta digital para arranque de año.',
        ctaText: 'Más información',
        scheduledDate: '2026-11-28',
        status: 'Borrador IA',
      },
    ],
    lastAuditedAt: '2026-11-21 06:30',
  };

  const invitationConfig: InvitationWebhookConfig = {
    enabled: true,
    endpointPath: '/api/reputation/webhooks/review-trigger',
    webhookSecretPreview: 'whsec_confia360_reputacion_live',
    publicReviewUrl: `https://g.page/r/${cleanHost.replace(/\./g, '-')}/review`,
    privateSupportLabel: '¿Tuviste alguna incidencia? Escríbenos directo aquí para resolverlo hoy',
    defaultChannel: 'WhatsApp',
    maxReminders: 2,
    whatsappTemplate: `Hola {{nombre}}, gracias por confiar en ${companyName} para {{servicio}}. Nos ayuda mucho conocer tu opinión real. Puedes dejar tu reseña en Google aquí: {{enlace_publico}} — {{soporte_privado}}: {{enlace_privado}} (Responder BAJA para no recibir avisos).`,
    smsTemplate: `${companyName}: gracias por tu visita ({{servicio}}). Opina en Google: {{enlace_publico}} | Soporte directo: {{enlace_privado}} | Baja: STOP`,
    emailSubject: `Tu opinión sobre ${companyName} nos ayuda a mejorar`,
    emailTemplate: `Hola {{nombre}},\n\nGracias por elegir a ${companyName}. Valoramos todas las opiniones por igual para seguir mejorando nuestro servicio en ${city}.\n\n• Dejar reseña pública en Google: {{enlace_publico}}\n• ¿Tuviste alguna incidencia que debamos resolver hoy?: {{enlace_privado}}\n\nPuedes darte de baja en cualquier momento desde este enlace.`,
    lastTriggeredAt: '2026-11-21 05:50',
  };

  const reviewInvitations: ReviewInvitation[] = [
    {
      id: 'inv-1',
      customerName: isValencia ? 'Laura Giménez' : 'Sofía Navarro',
      contact: '+34 622 410 812',
      serviceName: isValencia ? 'Implante Carga Inmediata' : 'Diagnóstico Kit Digital',
      channel: 'WhatsApp',
      status: 'Reseña Publicada',
      sentAt: '2026-11-18 17:20',
      remindersSent: 0,
      maxReminders: 2,
      consentVerified: true,
      publicLinkUsed: invitationConfig.publicReviewUrl,
      privateSupportTriggered: false,
    },
    {
      id: 'inv-2',
      customerName: isValencia ? 'Pablo Revert' : 'Alberto Méndez',
      contact: 'alberto.mendez@empresa-ejemplo.es',
      serviceName: isValencia ? 'Ortodoncia Invisible' : 'Implantación CRM Pyme',
      channel: 'Email',
      status: 'Incidencia Privada',
      sentAt: '2026-11-19 11:45',
      remindersSent: 0,
      maxReminders: 2,
      consentVerified: true,
      publicLinkUsed: invitationConfig.publicReviewUrl,
      privateSupportTriggered: true,
    },
    {
      id: 'inv-3',
      customerName: isValencia ? 'Teresa Vicent' : 'Diego Alcaraz',
      contact: '+34 655 901 340',
      serviceName: isValencia ? 'Higiene + Blanqueamiento LED' : 'Auditoría SEO Local',
      channel: 'WhatsApp',
      status: 'Clic Enlace Público',
      sentAt: '2026-11-20 18:10',
      remindersSent: 1,
      maxReminders: 2,
      consentVerified: true,
      publicLinkUsed: invitationConfig.publicReviewUrl,
      privateSupportTriggered: false,
    },
    {
      id: 'inv-4',
      customerName: isValencia ? 'Marcos Serra' : 'Raquel Domínguez',
      contact: '+34 611 204 778',
      serviceName: isValencia ? 'Revisión Preventiva' : 'Consultoría Estratégica 360º',
      channel: 'SMS',
      status: 'Enviada',
      sentAt: '2026-11-21 05:50',
      remindersSent: 0,
      maxReminders: 2,
      consentVerified: true,
      publicLinkUsed: invitationConfig.publicReviewUrl,
      privateSupportTriggered: false,
    },
  ];

  const reviewIncidents: ReviewIncidentCase[] = [
    {
      id: 'inc-1',
      source: 'Canal Privado Paralelo',
      customerName: isValencia ? 'Pablo Revert' : 'Alberto Méndez',
      platform: 'Soporte Directo Confia360',
      category: 'Facturación',
      severity: 'Alta',
      summary: isValencia
        ? 'Solicita desglose detallado de cuotas sin intereses antes del segundo pago.'
        : 'Duda sobre concepto de alta inicial en factura enviada tras arranque del servicio.',
      status: 'En gestión',
      owner: 'Lucía Serrano',
      slaDueAt: '2026-11-21 18:00',
      suggestedAction:
        'Llamada directa hoy con envío de desglose aclaratorio en PDF y confirmación de cita de seguimiento sin publicar datos personales.',
      resolutionNotes: 'Contactado por teléfono a las 10:15; pendiente confirmar recepción del anexo.',
      createdAt: '2026-11-19 13:10',
    },
    {
      id: 'inc-2',
      source: 'Reseña GBP',
      reviewId: isValencia ? 'rev-v1' : 'rev-2',
      customerName: isValencia ? 'Paciente Ruzafa' : 'Marta Domínguez',
      rating: 4,
      platform: 'Google Business Profile',
      category: 'Espera / Retraso',
      severity: 'Media',
      summary: isValencia
        ? 'Mención a 20 minutos de espera en sala respecto a la hora reservada.'
        : 'El arranque de la auditoría técnica tardó un día más de lo esperado.',
      status: 'Abierta',
      owner: 'Carlos Navarro',
      slaDueAt: '2026-11-22 12:00',
      suggestedAction:
        'Agradecer transparencia, confirmar ajuste en protocolo de confirmación previa 24 h y revisar tiempos internos de entrega.',
      resolutionNotes: '',
      createdAt: '2026-11-16 14:20',
    },
    {
      id: 'inc-3',
      source: isValencia ? 'Portal Sectorial' : 'Comentario Social',
      customerName: isValencia ? 'Jorge M. (Doctoralia)' : '@pyme_sergio (TikTok)',
      rating: 2,
      platform: isValencia ? 'Doctoralia' : 'TikTok',
      category: 'Precio',
      severity: 'Alta',
      summary: isValencia
        ? 'Comentario en Doctoralia indicando duda sobre si la financiación al 0% incluía el estudio TAC.'
        : 'Comentario negativo en vídeo de TikTok preguntando por costes ocultos tras la fase inicial.',
      status: 'Abierta',
      owner: 'Lucía Serrano',
      slaDueAt: '2026-11-21 19:30',
      suggestedAction: isValencia
        ? 'Responder públicamente en Doctoralia con tono clínico cordial invitando a revisar el presupuesto cerrado por vía privada.'
        : 'Responder en TikTok con transparencia sin tecnicismos e invitar a mensaje directo para aclarar presupuesto exacto.',
      resolutionNotes: '',
      createdAt: '2026-11-21 04:45',
    },
  ];

  const directoryListings: DirectoryListing[] = [
    {
      id: 'dir-1',
      directoryName: 'Google Business Profile',
      tier: 'Esencial',
      profileUrl: `https://maps.google.com/?q=${encodeURIComponent(companyName + ' ' + city)}`,
      status: 'Sincronizado',
      detectedName: companyName,
      detectedAddress: masterAddress,
      detectedPhone: masterPhone,
      detectedHours: 'L-V 09:00–19:00',
      discrepancies: [],
      duplicateCount: 0,
      solicitationPolicy: 'Invitación neutra permitida',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-2',
      directoryName: 'Apple Business Connect (Apple Maps)',
      tier: 'Redes / Mapas',
      profileUrl: `https://maps.apple.com/?q=${encodeURIComponent(companyName)}`,
      status: 'Inconsistencia NAP',
      detectedName: companyName,
      detectedAddress: isValencia ? 'Gran Vía Marqués Turia 42' : 'C/ Gran Vía 38, Madrid',
      detectedPhone: isValencia ? '+34 960 214 000' : '+34 910 482 300',
      detectedHours: 'L-V 09:00–18:00',
      discrepancies: ['Teléfono antiguo detectado', 'Horario de tarde desactualizado (-1 h)'],
      duplicateCount: 0,
      solicitationPolicy: 'Solo ficha y catálogo',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-3',
      directoryName: 'Bing Places for Business',
      tier: 'Esencial',
      profileUrl: 'https://www.bingplaces.com',
      status: 'Sin Reclamar',
      detectedName: `${companyName} ${city}`,
      detectedAddress: masterAddress,
      detectedPhone: masterPhone,
      detectedHours: 'Sin confirmar',
      discrepancies: ['Ficha sin verificar por propietario', 'Faltan horarios y sitio web'],
      duplicateCount: 0,
      solicitationPolicy: 'Solo ficha y catálogo',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-4',
      directoryName: 'Trustpilot',
      tier: 'Esencial',
      profileUrl: `https://es.trustpilot.com/review/${cleanHost}`,
      status: 'Sincronizado',
      detectedName: companyName,
      detectedAddress: masterAddress,
      detectedPhone: masterPhone,
      detectedHours: 'L-V 09:00–19:00',
      discrepancies: [],
      duplicateCount: 0,
      solicitationPolicy: 'Invitación neutra permitida',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-5',
      directoryName: 'Páginas Amarillas',
      tier: 'Esencial',
      profileUrl: `https://www.paginasamarillas.es/f/${cleanHost}`,
      status: 'Duplicado Detectado',
      detectedName: `${companyName} S.L.`,
      detectedAddress: masterAddress,
      detectedPhone: masterPhone,
      detectedHours: 'L-V 09:00–19:00',
      discrepancies: ['Existe 1 ficha duplicada con razón social antigua sin web asociada'],
      duplicateCount: 1,
      solicitationPolicy: 'Invitación neutra permitida',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-6',
      directoryName: isValencia ? 'Doctoralia España' : 'LinkedIn Empresa',
      tier: 'Sectorial',
      profileUrl: isValencia ? 'https://www.doctoralia.es' : `https://www.linkedin.com/company/${cleanHost.split('.')[0]}`,
      status: isValencia ? 'Inconsistencia NAP' : 'Sincronizado',
      detectedName: companyName,
      detectedAddress: masterAddress,
      detectedPhone: isValencia ? '+34 960 000 111' : masterPhone,
      detectedHours: 'L-V 09:00–19:00',
      discrepancies: isValencia
        ? ['Teléfono de centralita antiguo en ficha de especialista']
        : [],
      duplicateCount: 0,
      solicitationPolicy: 'Invitación neutra permitida',
      lastCheckedAt: '2026-11-21 06:15',
    },
    {
      id: 'dir-7',
      directoryName: 'Yelp España',
      tier: 'Redes / Mapas',
      profileUrl: 'https://www.yelp.es',
      status: 'Sincronizado',
      detectedName: companyName,
      detectedAddress: masterAddress,
      detectedPhone: masterPhone,
      detectedHours: 'L-V 09:00–19:00',
      discrepancies: [],
      duplicateCount: 0,
      solicitationPolicy: 'No solicitar reseñas (regla plataforma)',
      lastCheckedAt: '2026-11-21 06:15',
    },
  ];

  const reputationKpisTimeline: ReputationKpiPoint[] = isValencia
    ? [
        { period: 'Dic 25', avgRating: 4.3, competitorAvgRating: 4.4, responseRatePct: 58, mapsVisibilitySharePct: 19, competitorTopSharePct: 29, reviewsCount: 64 },
        { period: 'Ene 26', avgRating: 4.4, competitorAvgRating: 4.4, responseRatePct: 64, mapsVisibilitySharePct: 21, competitorTopSharePct: 28, reviewsCount: 71 },
        { period: 'Feb 26', avgRating: 4.4, competitorAvgRating: 4.3, responseRatePct: 70, mapsVisibilitySharePct: 23, competitorTopSharePct: 28, reviewsCount: 79 },
        { period: 'Mar 26', avgRating: 4.5, competitorAvgRating: 4.4, responseRatePct: 76, mapsVisibilitySharePct: 25, competitorTopSharePct: 27, reviewsCount: 88 },
        { period: 'Abr 26', avgRating: 4.5, competitorAvgRating: 4.4, responseRatePct: 81, mapsVisibilitySharePct: 27, competitorTopSharePct: 27, reviewsCount: 96 },
        { period: 'May 26', avgRating: 4.6, competitorAvgRating: 4.4, responseRatePct: 85, mapsVisibilitySharePct: 29, competitorTopSharePct: 26, reviewsCount: 105 },
        { period: 'Jun 26', avgRating: 4.6, competitorAvgRating: 4.4, responseRatePct: 88, mapsVisibilitySharePct: 31, competitorTopSharePct: 26, reviewsCount: 114 },
        { period: 'Jul 26', avgRating: 4.7, competitorAvgRating: 4.4, responseRatePct: 91, mapsVisibilitySharePct: 32, competitorTopSharePct: 25, reviewsCount: 121 },
        { period: 'Ago 26', avgRating: 4.7, competitorAvgRating: 4.3, responseRatePct: 92, mapsVisibilitySharePct: 33, competitorTopSharePct: 25, reviewsCount: 128 },
        { period: 'Sep 26', avgRating: 4.7, competitorAvgRating: 4.4, responseRatePct: 94, mapsVisibilitySharePct: 35, competitorTopSharePct: 24, reviewsCount: 137 },
        { period: 'Oct 26', avgRating: 4.8, competitorAvgRating: 4.4, responseRatePct: 96, mapsVisibilitySharePct: 37, competitorTopSharePct: 24, reviewsCount: 146 },
        { period: 'Nov 26', avgRating: 4.8, competitorAvgRating: 4.4, responseRatePct: 97, mapsVisibilitySharePct: 39, competitorTopSharePct: 23, reviewsCount: 154 },
      ]
    : [
        { period: 'Dic 25', avgRating: 4.2, competitorAvgRating: 4.3, responseRatePct: 52, mapsVisibilitySharePct: 16, competitorTopSharePct: 28, reviewsCount: 48 },
        { period: 'Ene 26', avgRating: 4.3, competitorAvgRating: 4.3, responseRatePct: 60, mapsVisibilitySharePct: 18, competitorTopSharePct: 28, reviewsCount: 54 },
        { period: 'Feb 26', avgRating: 4.3, competitorAvgRating: 4.3, responseRatePct: 66, mapsVisibilitySharePct: 20, competitorTopSharePct: 27, reviewsCount: 61 },
        { period: 'Mar 26', avgRating: 4.4, competitorAvgRating: 4.4, responseRatePct: 72, mapsVisibilitySharePct: 23, competitorTopSharePct: 27, reviewsCount: 69 },
        { period: 'Abr 26', avgRating: 4.5, competitorAvgRating: 4.4, responseRatePct: 78, mapsVisibilitySharePct: 25, competitorTopSharePct: 26, reviewsCount: 77 },
        { period: 'May 26', avgRating: 4.5, competitorAvgRating: 4.4, responseRatePct: 82, mapsVisibilitySharePct: 27, competitorTopSharePct: 26, reviewsCount: 84 },
        { period: 'Jun 26', avgRating: 4.6, competitorAvgRating: 4.4, responseRatePct: 86, mapsVisibilitySharePct: 29, competitorTopSharePct: 25, reviewsCount: 92 },
        { period: 'Jul 26', avgRating: 4.6, competitorAvgRating: 4.4, responseRatePct: 89, mapsVisibilitySharePct: 31, competitorTopSharePct: 25, reviewsCount: 99 },
        { period: 'Ago 26', avgRating: 4.7, competitorAvgRating: 4.3, responseRatePct: 90, mapsVisibilitySharePct: 32, competitorTopSharePct: 24, reviewsCount: 106 },
        { period: 'Sep 26', avgRating: 4.7, competitorAvgRating: 4.4, responseRatePct: 93, mapsVisibilitySharePct: 34, competitorTopSharePct: 24, reviewsCount: 114 },
        { period: 'Oct 26', avgRating: 4.8, competitorAvgRating: 4.4, responseRatePct: 95, mapsVisibilitySharePct: 36, competitorTopSharePct: 23, reviewsCount: 122 },
        { period: 'Nov 26', avgRating: 4.8, competitorAvgRating: 4.4, responseRatePct: 96, mapsVisibilitySharePct: 38, competitorTopSharePct: 22, reviewsCount: 131 },
      ];

  const reputationCompetitors: ReputationCompetitorBenchmark[] = isValencia
    ? [
        { id: 'comp-v1', name: 'Dental Turia Center', avgRating: 4.6, reviewsCount: 142, responseRatePct: 71, mapsSharePct: 23 },
        { id: 'comp-v2', name: 'Instituto Eixample Dental', avgRating: 4.4, reviewsCount: 118, responseRatePct: 54, mapsSharePct: 19 },
        { id: 'comp-v3', name: 'Clínica Ruzafa Salud', avgRating: 4.2, reviewsCount: 86, responseRatePct: 38, mapsSharePct: 13 },
      ]
    : [
        { id: 'comp-1', name: 'Asesoría Ágil Madrid', avgRating: 4.6, reviewsCount: 119, responseRatePct: 68, mapsSharePct: 22 },
        { id: 'comp-2', name: 'ImpulsoPyme Consulting', avgRating: 4.4, reviewsCount: 94, responseRatePct: 51, mapsSharePct: 18 },
        { id: 'comp-3', name: 'Digitaliza360 Iberia', avgRating: 4.2, reviewsCount: 71, responseRatePct: 35, mapsSharePct: 14 },
      ];

  return {
    enabledModules: ['reputacion_local', 'seo_geo', 'campanas'],
    gbpAudit,
    invitationConfig,
    reviewInvitations,
    reviewIncidents,
    directoryListings,
    socialListeningAddonEnabled: true,
    enabledReputationSources: [...ALL_REPUTATION_SOURCES],
    reputationSourcesCatalog: DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item })),
    reputationKpisTimeline,
    reputationCompetitors,
  };
}

export function createDefaultGrowthExtensions(city: string, sector: string): {
  catalog: CatalogItem[];
  calendarEvents: CalendarEvent[];
  weather: WeatherSnapshot;
  proactiveAlerts: ProactiveAlert[];
  campaigns: MediaCampaign[];
  reviewPolicy: ReviewAutomationPolicy;
  seasonalActions: SeasonalAction[];
  proactiveSeoSuggestions: ProactiveSeoSuggestion[];
} {
  const isMadrid = city.toLowerCase().includes('madrid');
  const isValencia = city.toLowerCase().includes('valencia');
  const lat = isValencia ? 39.4699 : 40.4168;
  const lng = isValencia ? -0.3763 : -3.7038;

  const catalog: CatalogItem[] = isValencia
    ? [
        {
          id: 'cat-v1',
          sku: 'IMP-CARGA',
          name: 'Pack Diagnóstico + Implante Carga Inmediata',
          category: 'Implantología',
          priceEur: 1150,
          stockUnits: 14,
          minThreshold: 4,
          surplusThreshold: 12,
          seasonality: 'Todo el año',
          linkedWebPath: '/tratamientos/carga-inmediata-implantes-dentales',
        },
        {
          id: 'cat-v2',
          sku: 'ORT-INV',
          name: 'Ortodoncia Invisible Fase Inicial (Plazas mes)',
          category: 'Ortodoncia',
          priceEur: 2450,
          stockUnits: 2,
          minThreshold: 3,
          surplusThreshold: 10,
          seasonality: 'Cierre Fiscal / Campaña',
          linkedWebPath: '/tratamientos/ortodoncia-invisible',
        },
        {
          id: 'cat-v3',
          sku: 'BLANQ-LAB',
          name: 'Higiene + Blanqueamiento LED Pre-Navidad',
          category: 'Estética',
          priceEur: 240,
          stockUnits: 26,
          minThreshold: 5,
          surplusThreshold: 18,
          seasonality: 'Cierre Fiscal / Campaña',
          linkedWebPath: '/tratamientos/estetica-dental',
        },
      ]
    : [
        {
          id: 'cat-1',
          sku: 'KD-PYME-360',
          name: 'Pack Digitalización Pyme + Web Local + CRM',
          category: 'Consultoría Digital',
          priceEur: 1800,
          stockUnits: 22,
          minThreshold: 5,
          surplusThreshold: 16,
          seasonality: 'Cierre Fiscal / Campaña',
          linkedWebPath: '/servicios/kit-digital-madrid',
        },
        {
          id: 'cat-2',
          sku: 'AUD-GEO-LOC',
          name: 'Auditoría Geo-Grid + Optimización Ficha GBP',
          category: 'SEO Local',
          priceEur: 350,
          stockUnits: 18,
          minThreshold: 4,
          surplusThreshold: 15,
          seasonality: 'Todo el año',
          linkedWebPath: '/servicios/posicionamiento-local',
        },
        {
          id: 'cat-3',
          sku: 'SEC-TELE',
          name: 'Kit Puesto Seguro + Acceso Remoto Días de Lluvia',
          category: 'Ciberseguridad',
          priceEur: 490,
          stockUnits: 3,
          minThreshold: 4,
          surplusThreshold: 12,
          seasonality: 'Lluvia / Frío',
          linkedWebPath: '/servicios/puesto-seguro',
        },
        {
          id: 'cat-4',
          sku: 'AUTO-VER',
          name: 'Automatización Factura Electrónica y Reservas',
          category: 'Automatización',
          priceEur: 650,
          stockUnits: 11,
          minThreshold: 3,
          surplusThreshold: 14,
          seasonality: 'Cierre Fiscal / Campaña',
          linkedWebPath: '/servicios/automatizacion',
        },
      ];

  const calendarEvents: CalendarEvent[] = [
    {
      id: 'cal-1',
      date: '2026-11-27',
      title: 'Black Friday & Semana de Captación Pyme',
      scope: 'Nacional',
      commercialPriority: 'Alta',
      linkedCatalogIds: [catalog[0].id],
      recommendedAction:
        'Impulsar campaña en Meta Ads y TikTok en los códigos postales con menor visibilidad del Geo-Grid.',
    },
    {
      id: 'cal-4',
      date: '2026-11-30',
      title: 'Cyber Monday · Impulso Contratación Online',
      scope: 'Nacional',
      commercialPriority: 'Alta',
      linkedCatalogIds: [catalog[0].id],
      recommendedAction:
        'Reforzar landing de conversión rápida con FAQ JSON-LD y anuncio de retargeting local.',
    },
    {
      id: 'cal-2',
      date: '2026-12-08',
      title: 'Puente de Diciembre & Campaña Pre-Navidad Q4',
      scope: 'Sectorial',
      commercialPriority: 'Alta',
      linkedCatalogIds: [catalog[catalog.length - 1].id],
      recommendedAction:
        'Activar YouTube Shorts comparativos y actualización en Google Business Profile.',
    },
    {
      id: 'cal-5',
      date: '2026-12-22',
      title: 'Cierre Fiscal y Presupuestos Anuales',
      scope: 'Sectorial',
      commercialPriority: 'Alta',
      linkedCatalogIds: [catalog[0].id],
      recommendedAction:
        'Publicar comparativa de inversión deducible / retorno Q1 para captar decisores en búsqueda IA.',
    },
    {
      id: 'cal-6',
      date: '2027-01-07',
      title: 'Rebajas de Enero y Arranque Primer Trimestre',
      scope: 'Nacional',
      commercialPriority: 'Media',
      linkedCatalogIds: [catalog[1]?.id || catalog[0].id],
      recommendedAction:
        'Reactivar clústeres de intención comercial y ajustar horarios en ficha GBP.',
    },
    {
      id: 'cal-3',
      date: isValencia ? '2027-03-15' : '2027-05-15',
      title: isValencia ? 'Fallas Valencia · Campaña Proximidad Local' : 'San Isidro Madrid · Campaña Comercio y Pymes',
      scope: 'Local Sede',
      commercialPriority: 'Media',
      linkedCatalogIds: [catalog[1]?.id || catalog[0].id],
      recommendedAction:
        'Publicar guía local con schema LocalBusiness y oferta geolocalizada en radio de 3 km.',
    },
  ];

  const weather: WeatherSnapshot = {
    city,
    lat,
    lng,
    temperatureC: isValencia ? 17.5 : 11.2,
    precipitationMm: 0.4,
    precipitationProbPct: 35,
    conditionLabel: isValencia ? 'Intervalos nubosos' : 'Fresco con nubosidad variable',
    scenarioMode: 'real',
    sourceLabel: 'Referencia inicial · Pulsa evaluar para clima en vivo',
    updatedAt: '2026-11-21 06:00',
  };

  const proactiveAlerts: ProactiveAlert[] = [
    {
      id: 'alt-1',
      triggerType: 'Calendario',
      severity: 'Oportunidad',
      title: 'Black Friday en 6 días: priorizar servicio con capacidad disponible',
      detail: `Tu servicio "${catalog[0].name}" tiene ${catalog[0].stockUnits} plazas/unidades disponibles y coincide con pico de búsqueda comercial en ${city}.`,
      recommendedChannel: 'Meta Ads',
      suggestedTopic: `${catalog[0].name} en ${city} · Campaña Q4`,
      relatedCatalogId: catalog[0].id,
      status: 'Activa',
      createdAt: '2026-11-21 06:00',
    },
    {
      id: 'alt-2',
      triggerType: 'Stock',
      severity: 'Crítica',
      title: `Stock/capacidad baja detectada en "${catalog[isValencia ? 1 : 2].name}"`,
      detail: `Solo quedan ${catalog[isValencia ? 1 : 2].stockUnits} unidades (mínimo ${catalog[isValencia ? 1 : 2].minThreshold}). Recomendado pausar inversión paid y redirigir tráfico hacia ${catalog[0].name}.`,
      recommendedChannel: 'Google Business Profile',
      suggestedTopic: `Reajuste de oferta por capacidad limitada en ${sector}`,
      relatedCatalogId: catalog[isValencia ? 1 : 2].id,
      status: 'Activa',
      createdAt: '2026-11-21 06:05',
    },
  ];

  const campaigns: MediaCampaign[] = [
    {
      id: 'camp-1',
      channel: 'TikTok',
      title: `Guía rápida 30s: errores al contratar ${sector.toLowerCase()} en ${city}`,
      objective: 'Leads locales',
      status: 'Aprobada',
      budgetEurMonth: 450,
      targetPostalCodes: isMadrid ? ['28020', '28004', '28010'] : ['46001', '46010'],
      calendarOrAlertRef: 'Black Friday & Semana de Captación Pyme',
      hook3s: `Si tienes una pyme en ${city}, revisa estos 3 puntos antes de perder presupuesto este trimestre.`,
      videoScript: `0-3s: Hook directo a cámara en sede ${city}.\n3-15s: Mostrar malla Geo-Grid real y comparativa de costes.\n15-25s: Explicar garantía y propiedad de datos.\n25-30s: CTA al diagnóstico gratuito en 48 h.`,
      adCopyPrimary: `Captación local transparente en ${city}. Resultados medibles en llamadas, WhatsApp y leads sin permanencia oculta.`,
      adHeadline: `Diagnóstico local en ${city} en 48 h`,
      ctaLabel: 'Solicitar diagnóstico',
      estimatedLeads: 26,
      estimatedCplEur: 17.3,
      createdAt: '2026-11-20',
    },
    {
      id: 'camp-2',
      channel: 'Meta Ads',
      title: `Campaña Geosegmentada Distrito ${isMadrid ? 'Tetuán y Chamberí' : 'Ciutat Vella'}`,
      objective: 'Leads locales',
      status: 'Activa',
      budgetEurMonth: 600,
      targetPostalCodes: isMadrid ? ['28020', '28010'] : ['46001', '46005'],
      calendarOrAlertRef: 'Malla Geo-Grid · Zonas por reforzar',
      hook3s: `¿Tu negocio en ${city} aparece cuando te buscan en Google Maps o en ChatGPT?`,
      videoScript: `Carrusel de 4 tarjetas: 1. Mapa de visibilidad local por CP. 2. Caso real verificado. 3. Garantía transparente. 4. Formulario instantáneo.`,
      adCopyPrimary: `Detecta en qué códigos postales de ${city} te están ganando tus competidores y activa un plan de 90 días con aprobación humana.`,
      adHeadline: `${catalog[0].name} · ${city}`,
      ctaLabel: 'Más información',
      estimatedLeads: 34,
      estimatedCplEur: 17.6,
      createdAt: '2026-11-18',
    },
  ];

  const reviewPolicy: ReviewAutomationPolicy = {
    mode: 'Mixto',
    minAutoStars: 4,
    lastUpdatedAt: '2026-11-21 06:00',
  };

  const seasonalActions: SeasonalAction[] = [
    {
      id: 'sea-1',
      title: `Guía comparativa Q4 y campaña local para ${catalog[0].name}`,
      scheduledDate: '2026-11-25',
      seasonalityTag: 'Campaña Comercial / Festivo',
      actionType: 'Artículo SEO/GEO',
      channel: 'Blog / Web',
      linkedEventId: 'cal-1',
      linkedAlertId: 'alt-1',
      linkedCatalogId: catalog[0].id,
      notes: `Publicar antes del Black Friday con marcado FAQPage y enlace interno hacia ${catalog[0].linkedWebPath}.`,
      owner: 'Lucía Serrano',
      status: 'Programada',
    },
    {
      id: 'sea-2',
      title: `Reajuste de puja y aviso de disponibilidad (${catalog[isValencia ? 1 : 2].sku})`,
      scheduledDate: '2026-11-22',
      seasonalityTag: 'Lluvia / Frío',
      actionType: 'Ajuste Stock / Oferta',
      channel: 'Google Business Profile',
      linkedAlertId: 'alt-2',
      linkedCatalogId: catalog[isValencia ? 1 : 2].id,
      notes: 'Redirigir tráfico paid hacia referencias con excedente mientras se repone capacidad.',
      owner: 'Carlos Navarro',
      status: 'En curso',
    },
    {
      id: 'sea-3',
      title: `Short de YouTube: Cierre de presupuestos y retorno medible en ${city}`,
      scheduledDate: '2026-12-05',
      seasonalityTag: 'Sectorial',
      actionType: 'Campaña Meta/TikTok/YT',
      channel: 'YouTube',
      linkedEventId: 'cal-2',
      linkedCatalogId: catalog[catalog.length - 1].id,
      notes: 'Segmentación en códigos postales con ranking >3 del Geo-Grid.',
      owner: 'Elena Ruiz',
      status: 'Programada',
    },
  ];

  const proactiveSeoSuggestions: ProactiveSeoSuggestion[] = isValencia
    ? [
        {
          id: 'seo-opt-v1',
          queryId: 'geoq-v1',
          targetPageUrl: '/tratamientos/carga-inmediata-implantes-dentales',
          targetPageTitle: 'Implantes Dentales de Carga Inmediata en Valencia',
          optimizationType: 'Actualizar Landing Page',
          forecastedDropPct: -14.2,
          urgency: 'Alta',
          title: 'Añadir bloque de garantía escrita (5 años) y Nº Registro Sanitario en la landing',
          rationale:
            'Se prevé una caída del 14,2% en citas conversacionales tras diciembre por mayor peso de respuestas comparativas en Claude y Perplexity exigiendo acreditación oficial.',
          actionSteps: [
            'Insertar bloque visible con Nº Registro Sanitario 46-2190 y enlace al Colegio de Odontólogos.',
            'Añadir tabla comparativa de plazos (estudio TAC 3D vs carga inmediata) y rango cerrado desde 1.150 €.',
            'Actualizar JSON-LD MedicalClinic / Service con propiedad priceRange y medicalSpecialty.',
          ],
          estimatedRecoveryPct: 16,
          status: 'Pendiente',
          createdAt: '2026-11-21',
        },
      ]
    : [
        {
          id: 'seo-opt-1',
          queryId: 'geoq-2',
          targetPageUrl: '/servicios/kit-digital-madrid',
          targetPageTitle: 'Digitalización y Kit Digital para Pymes en Madrid',
          optimizationType: 'Comparativa y Precios',
          forecastedDropPct: -18.5,
          urgency: 'Alta',
          title: 'Actualizar landing de precios con desglose por tramos y FAQ antes del descenso post-Q4',
          rationale:
            'La demanda estacional de búsquedas de subvención cae un 18,5% previsto en enero mientras competidores capturan las citas de precio en ChatGPT y Gemini.',
          actionSteps: [
            'Publicar tabla de rangos reales desde 350 €/mes y comparativa con/sin bono Kit Digital en /servicios/kit-digital-madrid.',
            'Añadir 4 preguntas frecuentes con marcado JSON-LD FAQPage respondiendo plazos de diagnóstico en 48 h.',
            'Enlazar internamente hacia casos auditados de pymes en Chamberí y Salamanca (28010 / 28001).',
          ],
          estimatedRecoveryPct: 21,
          status: 'Pendiente',
          createdAt: '2026-11-21',
        },
        {
          id: 'seo-opt-2',
          queryId: 'geoq-1',
          targetPageUrl: '/servicios/consultoria-360',
          targetPageTitle: 'Consultoría Estratégica 360º para Pymes',
          optimizationType: 'Reforzar FAQ Conversacional',
          forecastedDropPct: -9.4,
          urgency: 'Media',
          title: 'Incorporar evidencias verificadas y certificaciones ISO 27001 para entrar en Claude',
          rationale:
            'Aunque ChatGPT y Perplexity mantienen mención estable, el índice de volumen baja un 9,4% previsto en diciembre y Claude sigue citando a ImpulsoPyme.',
          actionSteps: [
            'Añadir sección de métricas verificadas de ROI y propiedad intelectual del cliente en /servicios/consultoria-360.',
            'Citar fuente oficial Red.es y AEPD con enlaces salientes de autoridad.',
          ],
          estimatedRecoveryPct: 12,
          status: 'Pendiente',
          createdAt: '2026-11-21',
        },
      ];

  return {
    catalog,
    calendarEvents,
    weather,
    proactiveAlerts,
    campaigns,
    reviewPolicy,
    seasonalActions,
    proactiveSeoSuggestions,
  };
}

export const DEFAULT_ECOSYSTEM_LINKS: EcosystemBridgeItem[] = [
  {
    id: 'crm-leads',
    moduleName: 'Sincronización de Leads Locales (GBP, WhatsApp y Formularios)',
    ecosystemSuite: 'Confia360 CRM',
    description:
      'Envía automáticamente cada llamada, clic de WhatsApp y lead captado por código postal al embudo comercial del ecosistema Confia360.',
    status: 'Conectado',
    lastSyncAt: '2026-11-21 05:40',
    syncedRecords: 148,
    endpointPath: '/api/v1/confia360/crm/leads-sync',
  },
  {
    id: 'kit-digital',
    moduleName: 'Evidencias de Presencia Web Avanzada y SEO Local',
    ecosystemSuite: 'Confia360 Kit Digital',
    description:
      'Empaqueta auditorías técnicas, mallas Geo-Grid y publicaciones aprobadas como entregables verificables dentro del gestor de expedientes Confia360.',
    status: 'Conectado',
    lastSyncAt: '2026-11-20 19:15',
    syncedRecords: 14,
    endpointPath: '/api/v1/confia360/kit-digital/deliverables',
  },
  {
    id: 'portal-roi',
    moduleName: 'Informe Ejecutivo y Facturación Unificada AxesIA',
    ecosystemSuite: 'Confia360 Portal Cliente',
    description:
      'Publica el resumen mensual de CPL, retorno estimado y cuota de voz en IAs directamente en el área privada de cada cliente.',
    status: 'Pendiente',
    lastSyncAt: 'Sin sincronizar',
    syncedRecords: 0,
    endpointPath: '/api/v1/confia360/portal/reports',
  },
];

function buildGridNodes(
  baseLat: number,
  baseLng: number,
  gridSize: 5 | 7,
  zones: { name: string; cp: string }[],
  ranks: number[],
  competitors: string[]
): GeoGridNode[] {
  const nodes: GeoGridNode[] = [];
  const half = Math.floor(gridSize / 2);
  let idx = 0;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const zone = zones[idx % zones.length];
      const rank = ranks[idx % ranks.length];
      const prev = Math.min(20, Math.max(1, rank + (idx % 3 === 0 ? 2 : idx % 2 === 0 ? 1 : -1)));
      const lat = Number((baseLat + (half - r) * 0.011).toFixed(4));
      const lng = Number((baseLng + (c - half) * 0.014).toFixed(4));

      nodes.push({
        id: `node-${r}-${c}`,
        row: r,
        col: c,
        lat,
        lng,
        zoneName: zone.name,
        postalCode: zone.cp,
        rank,
        previousRank: prev,
        topCompetitors: [
          {
            name: rank === 1 ? 'Tu negocio (Líder local)' : competitors[0],
            rank: 1,
            rating: 4.9,
            reviews: 142,
          },
          {
            name: rank === 2 ? 'Tu negocio' : competitors[1],
            rank: 2,
            rating: 4.7,
            reviews: 98,
          },
          {
            name: rank === 3 ? 'Tu negocio' : competitors[2],
            rank: 3,
            rating: 4.6,
            reviews: 76,
          },
        ],
      });
      idx++;
    }
  }
  return nodes;
}

const madridZones = [
  { name: 'Chamberí', cp: '28010' },
  { name: 'Salamanca', cp: '28001' },
  { name: 'Centro · Sol', cp: '28013' },
  { name: 'Retiro', cp: '28009' },
  { name: 'Argüelles', cp: '28008' },
  { name: 'Chueca · Justicia', cp: '28004' },
  { name: 'Tetuán', cp: '28020' },
  { name: 'Arganzuela', cp: '28045' },
  { name: 'Chamartín', cp: '28016' },
];

const valenciaZones = [
  { name: 'Eixample · Ruzafa', cp: '46005' },
  { name: 'Ciutat Vella', cp: '46001' },
  { name: 'Pla del Real', cp: '46010' },
  { name: 'Extramurs', cp: '46007' },
  { name: 'Camins al Grau', cp: '46022' },
  { name: 'Campanar', cp: '46015' },
];

export const INITIAL_PROJECTS: ProjectWorkspace[] = [
  {
    id: 'proj-mundoconfia',
    name: 'AsexIA · Madrid Centro',
    plan: 'Agency',
    profile: {
      companyName: 'AsexIA',
      domain: 'https://asexia.es',
      sector: 'Consultoría de Digitalización y Ayudas para Pymes',
      country: 'España',
      primaryCity: 'Madrid',
      language: 'es-ES',
      valueProposition:
        'Acompañamiento integral 360º para pymes y autónomos en transformación digital, tramitación de ayudas Kit Digital y posicionamiento comercial medible.',
      targetAudience:
        'Autónomos, microempresas y pymes españolas de 1 a 49 empleados que buscan digitalizarse con retorno económico verificable.',
      services: [
        'Agente Digitalizador Kit Digital',
        'Consultoría Estratégica 360º para Pymes',
        'Automatización y Presencia Web Local',
        'Ciberseguridad y Puesto de Trabajo Seguro',
      ],
      competitors: ['ImpulsoPyme Consulting', 'Digitaliza360 Iberia', 'Asesoría Ágil Madrid'],
      yearsExperience: 11,
      certifications: [
        'Agente Digitalizador Adherido Red.es',
        'ISO/IEC 27001 Gestión de Seguridad',
        'Partner Certificado Google Workspace',
      ],
      priceRange: 'Desde 350 €/mes · Subvencionable hasta 12.000 € según segmento',
      guarantees:
        'Diagnóstico inicial sin coste en 48 horas y reporte mensual de leads cualificados sin permanencia oculta.',
      commercialPolicy:
        'Cumplimiento estricto RGPD/LOPDGDD. Propiedad intelectual íntegra del cliente sobre su web y contenidos.',
      forbiddenClaims: [
        'Posicionamiento #1 garantizado en Google',
        'Subvención aprobada al 100% sin requisitos',
        'Resultados inmediatos en 24 horas',
      ],
      brandTone: 'Cercano, riguroso, transparente y orientado a negocio real de pyme.',
      gdprCompliant: true,
      lastAuditedAt: '2026-11-20 18:40',
    },
    kpis: {
      leadsMonth: 148,
      leadsDeltaPct: 24.6,
      cplEur: 18.4,
      estimatedRoiPct: 385,
      avgGeoGridPos: 2.8,
      aiShareOfVoicePct: 42.5,
      gbpCallsAndWhatsapp: 94,
      technicalHealthPct: 91,
    },
    roiTimeline: [
      { period: 'Jun', organicTraffic: 3120, totalLeads: 68, aiMentions: 11, cplEur: 29.5 },
      { period: 'Jul', organicTraffic: 3680, totalLeads: 81, aiMentions: 16, cplEur: 26.2 },
      { period: 'Ago', organicTraffic: 3940, totalLeads: 89, aiMentions: 21, cplEur: 24.0 },
      { period: 'Sep', organicTraffic: 4820, totalLeads: 109, aiMentions: 29, cplEur: 21.4 },
      { period: 'Oct', organicTraffic: 5690, totalLeads: 128, aiMentions: 36, cplEur: 19.8 },
      { period: 'Nov', organicTraffic: 6450, totalLeads: 148, aiMentions: 44, cplEur: 18.4 },
    ],
    geoKeywords: [
      {
        id: 'kw-1',
        keyword: 'consultoría digitalización pymes madrid',
        sedeName: 'Sede Madrid · Gran Vía',
        city: 'Madrid',
        radiusKm: 5,
        gridSize: 5,
        avgRank: 2.4,
        top3Pct: 76,
        visibilityScore: 84,
        monthlySearches: 1300,
        nodes: buildGridNodes(
          40.4203,
          -3.7058,
          5,
          madridZones,
          [4, 2, 1, 2, 5, 3, 1, 1, 2, 4, 2, 1, 1, 1, 3, 3, 2, 1, 2, 6, 5, 3, 2, 4, 7],
          ['ImpulsoPyme Consulting', 'Digitaliza360 Iberia', 'Asesoría Ágil Madrid']
        ),
      },
      {
        id: 'kw-2',
        keyword: 'agente digitalizador kit digital madrid',
        sedeName: 'Sede Madrid · Gran Vía',
        city: 'Madrid',
        radiusKm: 8,
        gridSize: 5,
        avgRank: 3.1,
        top3Pct: 64,
        visibilityScore: 76,
        monthlySearches: 2400,
        nodes: buildGridNodes(
          40.4203,
          -3.7058,
          5,
          madridZones,
          [6, 3, 2, 4, 7, 4, 2, 1, 3, 5, 3, 2, 1, 2, 4, 4, 3, 2, 3, 6, 7, 4, 3, 5, 8],
          ['Digitaliza360 Iberia', 'ImpulsoPyme Consulting', 'Asesoría Ágil Madrid']
        ),
      },
      {
        id: 'kw-3',
        keyword: 'automatización procesos pymes cerca de mí',
        sedeName: 'Sede Madrid · Gran Vía',
        city: 'Madrid',
        radiusKm: 3,
        gridSize: 7,
        avgRank: 2.1,
        top3Pct: 82,
        visibilityScore: 88,
        monthlySearches: 880,
        nodes: buildGridNodes(
          40.4203,
          -3.7058,
          7,
          madridZones,
          [3, 2, 1, 1, 2, 3, 4, 2, 1, 1, 1, 2, 2, 3, 1, 1, 1, 1, 1, 2, 3],
          ['Asesoría Ágil Madrid', 'ImpulsoPyme Consulting', 'Digitaliza360 Iberia']
        ),
      },
    ],
    postalMetrics: [
      {
        postalCode: '28013',
        district: 'Centro · Sol / Gran Vía',
        impressions: 6420,
        clicks: 618,
        calls: 26,
        whatsappClicks: 19,
        directionRequests: 41,
        formLeads: 24,
        avgPosition: 1.4,
        conversionRate: 11.2,
      },
      {
        postalCode: '28001',
        district: 'Salamanca · Goya',
        impressions: 5180,
        clicks: 445,
        calls: 17,
        whatsappClicks: 14,
        directionRequests: 24,
        formLeads: 18,
        avgPosition: 2.1,
        conversionRate: 10.9,
      },
      {
        postalCode: '28010',
        district: 'Chamberí · Alonso Martínez',
        impressions: 4690,
        clicks: 392,
        calls: 14,
        whatsappClicks: 11,
        directionRequests: 19,
        formLeads: 15,
        avgPosition: 2.3,
        conversionRate: 10.2,
      },
      {
        postalCode: '28004',
        district: 'Justicia · Tribunal',
        impressions: 3840,
        clicks: 310,
        calls: 11,
        whatsappClicks: 9,
        directionRequests: 15,
        formLeads: 12,
        avgPosition: 2.6,
        conversionRate: 9.8,
      },
      {
        postalCode: '28020',
        district: 'Tetuán · AZCA',
        impressions: 3210,
        clicks: 215,
        calls: 6,
        whatsappClicks: 5,
        directionRequests: 9,
        formLeads: 8,
        avgPosition: 4.5,
        conversionRate: 7.9,
      },
    ],
    clusters: [
      {
        id: 'cl-1',
        pillarTitle: 'Guía Integral de Digitalización y Kit Digital para Pymes (2026)',
        intentScope: 'Mixto SEO + GEO',
        commercialGoal: 'Leads',
        difficulty: 42,
        estimatedVolume: 3200,
        leadPotential: 'Alto',
        dueDate: '2026-11-28',
        owner: 'Lucía Serrano',
        status: 'En Revisión',
      },
      {
        id: 'cl-2',
        pillarTitle: 'Comparativa: ¿Qué consultora elegir para digitalizar una pyme en Madrid?',
        intentScope: 'GEO IA',
        commercialGoal: 'Menciones IA',
        difficulty: 28,
        estimatedVolume: 960,
        leadPotential: 'Alto',
        dueDate: '2026-12-04',
        owner: 'Carlos Navarro',
        status: 'En Redacción',
      },
      {
        id: 'cl-3',
        pillarTitle: 'Coste real de automatizar facturación y CRM en microempresas',
        intentScope: 'GEO IA',
        commercialGoal: 'Autoridad',
        difficulty: 31,
        estimatedVolume: 1450,
        leadPotential: 'Alto',
        dueDate: '2026-12-12',
        owner: 'Lucía Serrano',
        status: 'Planificado',
      },
      {
        id: 'cl-4',
        pillarTitle: 'SEO Local en Madrid: cómo captar clientes desde Google Business Profile',
        intentScope: 'Google SEO',
        commercialGoal: 'Tráfico Local',
        difficulty: 36,
        estimatedVolume: 1800,
        leadPotential: 'Medio',
        dueDate: '2026-11-18',
        owner: 'Elena Ruiz',
        status: 'Completado',
      },
    ],
    articles: [
      {
        id: 'art-1',
        clusterId: 'cl-1',
        title: 'Cómo aprovechar el Kit Digital y la consultoría 360º en pymes de Madrid en 2026',
        metaTitle: 'Kit Digital y Consultoría 360º para Pymes en Madrid | AsexIA',
        metaDescription:
          'Requisitos reales, importes por segmento y pasos auditados para digitalizar tu pyme con acompañamiento experto en Madrid.',
        slug: 'kit-digital-consultoria-360-pymes-madrid',
        url: 'https://asexia.es/guias/kit-digital-consultoria-360-pymes-madrid',
        intentType: 'GEO Conversacional',
        status: 'Pendiente Aprobación',
        authorHuman: 'Lucía Serrano',
        aiModel: 'gemini-4-hydrogen',
        promptSummary:
          'Redacción basada en BrandProfile verificado de AsexIA + normativa Red.es 2026 sin promesas garantizadas.',
        originalityScore: 97,
        sensitiveClaimFlag: true,
        complianceChecked: true,
        sections: [
          {
            heading: 'Qué cubre realmente la digitalización 360º para pymes',
            level: 'H2',
            body: 'Más allá de crear una web corporativa, las pymes madrileñas necesitan conectar captación local, CRM trazable y cumplimiento RGPD. En AsexIA estructuramos la implantación en fases de 30, 60 y 90 días con KPIs de leads medibles.',
          },
          {
            heading: 'Importes por segmento y documentación necesaria',
            level: 'H3',
            body: 'Según el tamaño de plantilla (autónomos y microempresas de 0 a 2 empleados, o pymes de hasta 49), la dotación económica varía y exige cumplir requisitos de antigüedad y estar al corriente con AEAT y Seguridad Social.',
          },
          {
            heading: 'Errores frecuentes que bloquean el retorno comercial',
            level: 'H2',
            body: 'Contratar soluciones aisladas sin seguimiento de llamadas, WhatsApp o formularios impide calcular el coste por lead real. La auditoría previa evita duplicar licencias.',
          },
        ],
        faq: [
          {
            question: '¿Cuánto tarda en ponerse en marcha el plan de digitalización?',
            answer:
              'El diagnóstico inicial se entrega en 48 horas hábiles y los primeros activos locales operativos suelen desplegarse en 3 a 4 semanas tras la aprobación del alcance.',
          },
          {
            question: '¿Quién conserva la propiedad de la web y los contenidos?',
            answer:
              'El cliente mantiene el 100% de la titularidad del dominio, contenidos generados y datos de analítica bajo cumplimiento RGPD.',
          },
        ],
        ctaText: 'Solicita tu diagnóstico gratuito en 48 horas con un consultor en Madrid',
        jsonLdType: 'FAQPage',
        jsonLdCode: JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cuánto tarda en ponerse en marcha el plan de digitalización?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El diagnóstico inicial se entrega en 48 horas hábiles y los primeros activos locales se despliegan en 3 a 4 semanas.',
                },
              },
            ],
          },
          null,
          2
        ),
        internalLinks: [
          '/servicios/agente-digitalizador-madrid',
          '/casos-exito/pymes-chamberi',
        ],
        sources: [
          {
            title: 'Portal Oficial Acelera Pyme · Condiciones Kit Digital',
            url: 'https://www.acelerapyme.gob.es',
            verified: true,
          },
          {
            title: 'AEPD · Guía de cumplimiento RGPD para pymes',
            url: 'https://www.aepd.es',
            verified: true,
          },
        ],
        imageSuggestion: {
          altText: 'Consultora de AsexIA revisando métricas de crecimiento local con gerente de pyme en Madrid',
          description: 'Fotografía editorial en oficina luminosa con mapa de rendimiento comercial.',
        },
        estimatedLeadsMonth: 28,
      },
      {
        id: 'art-2',
        clusterId: 'cl-4',
        title: 'Cómo aparecer en el Local Pack de Google Maps en Madrid Centro sin trampas',
        metaTitle: 'Posicionamiento Local y Google Business Profile en Madrid | AsexIA',
        metaDescription:
          'Optimiza categorías, reseñas verificadas y consistencia NAP por código postal para captar llamadas y visitas locales.',
        slug: 'aparecer-local-pack-madrid-google-business-profile',
        url: 'https://asexia.es/blog/aparecer-local-pack-madrid-google-business-profile',
        intentType: 'Google Local',
        status: 'Aprobado y Programado',
        authorHuman: 'Elena Ruiz',
        aiModel: 'gemini-4-hydrogen',
        promptSummary: 'Guía práctica de SEO local por códigos postales de Madrid con schema LocalBusiness.',
        reviewedBy: 'Carlos Navarro (Editor)',
        reviewedAt: '2026-11-19 16:20',
        scheduledFor: '2026-11-24 09:00',
        originalityScore: 95,
        sensitiveClaimFlag: false,
        complianceChecked: true,
        sections: [
          {
            heading: 'Consistencia NAP y señales de proximidad por distrito',
            level: 'H2',
            body: 'Google evalúa relevancia, distancia y prominencia. Unificar nombre, dirección y teléfono en directorios locales de Madrid refuerza la visibilidad en un radio de 5 km.',
          },
        ],
        faq: [
          {
            question: '¿Cada cuánto conviene responder reseñas en Google Business Profile?',
            answer:
              'Lo recomendable es responder en menos de 48 horas con tono natural, mencionando el servicio prestado sin incluir spam de palabras clave.',
          },
        ],
        ctaText: 'Audita tu ficha de Google Business Profile ahora',
        jsonLdType: 'LocalBusiness',
        jsonLdCode: JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'AsexIA Madrid',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Madrid',
              postalCode: '28013',
              addressCountry: 'ES',
            },
          },
          null,
          2
        ),
        internalLinks: ['/servicios/posicionamiento-local'],
        sources: [
          {
            title: 'Ayuda de Google Business Profile · Directrices de representación',
            url: 'https://support.google.com/business',
            verified: true,
          },
        ],
        imageSuggestion: {
          altText: 'Mapa Geo-Grid de posicionamiento local en el centro de Madrid',
          description: 'Captura limpia de malla de posiciones por código postal.',
        },
        estimatedLeadsMonth: 19,
      },
    ],
    aiQueries: [
      {
        id: 'geoq-1',
        query: '¿Qué agencia ayuda a pymes españolas a digitalizarse con acompañamiento real?',
        category: 'Recomendación',
        brandAppears: true,
        shareOfVoicePct: 48,
        competitorsMentioned: ['ImpulsoPyme Consulting', 'Digitaliza360 Iberia'],
        engines: [
          {
            engine: 'ChatGPT',
            mentioned: true,
            position: 2,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es/servicios/consultoria-360'],
          },
          {
            engine: 'Perplexity',
            mentioned: true,
            position: 1,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es', 'https://acelerapyme.gob.es'],
          },
          {
            engine: 'Gemini',
            mentioned: true,
            position: 2,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es/guias/kit-digital'],
          },
          {
            engine: 'Claude',
            mentioned: false,
            position: null,
            sentiment: 'Ausente',
            citedUrls: ['https://impulsopyme.es'],
          },
        ],
        missingContentOpportunity:
          'Publicar tabla comparativa transparente de honorarios y casos de éxito auditados para ganar mención directa en Claude.',
        lastCheckedAt: '2026-11-21 04:15',
        trendHistory: [
          { period: 'Ago', shareOfVoicePct: 36, queryVolumeIndex: 78 },
          { period: 'Sep', shareOfVoicePct: 41, queryVolumeIndex: 84 },
          { period: 'Oct', shareOfVoicePct: 46, queryVolumeIndex: 92 },
          { period: 'Nov', shareOfVoicePct: 48, queryVolumeIndex: 89 },
        ],
        forecastedDropPct: -9.4,
        forecastReason:
          'Desaceleración previsible en diciembre y pérdida de cuota en respuestas comparativas de Claude.',
      },
      {
        id: 'geoq-2',
        query: '¿Cuánto cuesta digitalizar una microempresa en Madrid con CRM y SEO local?',
        category: 'Precio',
        brandAppears: false,
        shareOfVoicePct: 18,
        competitorsMentioned: ['Digitaliza360 Iberia', 'Asesoría Ágil Madrid'],
        engines: [
          {
            engine: 'ChatGPT',
            mentioned: false,
            position: null,
            sentiment: 'Ausente',
            citedUrls: ['https://digitaliza360.es/precios'],
          },
          {
            engine: 'Perplexity',
            mentioned: true,
            position: 4,
            sentiment: 'Neutral',
            citedUrls: ['https://asexia.es'],
          },
          {
            engine: 'Gemini',
            mentioned: false,
            position: null,
            sentiment: 'Ausente',
            citedUrls: ['https://asesoriaagil.es'],
          },
          {
            engine: 'Claude',
            mentioned: false,
            position: null,
            sentiment: 'Ausente',
            citedUrls: [],
          },
        ],
        missingContentOpportunity:
          'Falta página pública con desglose de precios por rango, plazos y FAQ con marcado JSON-LD Service.',
        lastCheckedAt: '2026-11-20 19:10',
        trendHistory: [
          { period: 'Ago', shareOfVoicePct: 26, queryVolumeIndex: 88 },
          { period: 'Sep', shareOfVoicePct: 24, queryVolumeIndex: 85 },
          { period: 'Oct', shareOfVoicePct: 21, queryVolumeIndex: 79 },
          { period: 'Nov', shareOfVoicePct: 18, queryVolumeIndex: 72 },
        ],
        forecastedDropPct: -18.5,
        forecastReason:
          'Caída continuada 4 meses por falta de tabla pública de precios frente a Digitaliza360 y descenso post-Q4.',
      },
      {
        id: 'geoq-3',
        query: 'Mejor agente digitalizador en Madrid centro con soporte personalizado',
        category: 'Local',
        brandAppears: true,
        shareOfVoicePct: 54,
        competitorsMentioned: ['ImpulsoPyme Consulting'],
        engines: [
          {
            engine: 'ChatGPT',
            mentioned: true,
            position: 1,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es'],
          },
          {
            engine: 'Perplexity',
            mentioned: true,
            position: 2,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es/madrid'],
          },
          {
            engine: 'Gemini',
            mentioned: true,
            position: 1,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es'],
          },
          {
            engine: 'Claude',
            mentioned: true,
            position: 3,
            sentiment: 'Positivo',
            citedUrls: ['https://asexia.es'],
          },
        ],
        missingContentOpportunity:
          'Reforzar menciones en prensa económica regional para consolidar el puesto #1 en Perplexity.',
        lastCheckedAt: '2026-11-21 02:30',
        trendHistory: [
          { period: 'Ago', shareOfVoicePct: 42, queryVolumeIndex: 74 },
          { period: 'Sep', shareOfVoicePct: 47, queryVolumeIndex: 80 },
          { period: 'Oct', shareOfVoicePct: 51, queryVolumeIndex: 86 },
          { period: 'Nov', shareOfVoicePct: 54, queryVolumeIndex: 91 },
        ],
        forecastedDropPct: 6.2,
        forecastReason:
          'Tendencia alcista estable en los 4 motores IA gracias a reseñas locales en Madrid Centro.',
      },
    ],
    technicalIssues: [
      {
        id: 'tech-1',
        url: '/servicios/kit-digital-madrid/',
        category: 'Schema Markup',
        title: 'Falta propiedad areaServed y priceRange en JSON-LD LocalBusiness',
        recommendation:
          'Añadir códigos postales atendidos (28001–28020) y rango orientativo en el bloque estructurado.',
        impact: 'Alto',
        effort: 'Bajo',
        status: 'Pendiente',
        detectedAt: '2026-11-20',
      },
      {
        id: 'tech-2',
        url: '/blog/digitalizacion-2025-old',
        category: 'Canibalización',
        title: 'Dos URLs compiten por "consultoría digitalización pymes madrid"',
        recommendation:
          'Consolidar artículo de 2025 mediante redirección 301 hacia la página pilar actualizada de 2026.',
        impact: 'Alto',
        effort: 'Bajo',
        status: 'En curso',
        detectedAt: '2026-11-19',
      },
      {
        id: 'tech-3',
        url: '/recursos/checklist-ciberseguridad.pdf',
        category: 'Core Web Vitals',
        title: 'LCP de 3,4 s en móvil en landing de descarga',
        recommendation:
          'Comprimir imagen de cabecera en WebP (<90 KB) y diferir script de widget de chat.',
        impact: 'Medio',
        effort: 'Medio',
        status: 'Pendiente',
        detectedAt: '2026-11-18',
      },
      {
        id: 'tech-4',
        url: '/contacto-asesoria',
        category: 'Metadatos',
        title: 'Meta descripción duplicada respecto a /servicios/consultoria-360',
        recommendation:
          'Redactar descripción única orientada a concertar cita presencial u online en Madrid.',
        impact: 'Medio',
        effort: 'Bajo',
        status: 'Resuelto',
        detectedAt: '2026-11-15',
      },
    ],
    backlinks: [
      {
        id: 'bl-1',
        domain: 'madridiario.es',
        category: 'Prensa Local',
        relevanceScore: 92,
        estimatedTraffic: 145000,
        spamScore: 2,
        editorialJustification:
          'Sección Economía y Pymes de Madrid; oportunidad de tribuna sobre digitalización práctica con datos propios.',
        anchorSuggestion: 'estudio de digitalización de AsexIA',
        status: 'Outreach Enviado',
        contactEmail: 'redaccion.economia@madridiario.es',
      },
      {
        id: 'bl-2',
        domain: 'ceim.es',
        category: 'Asociación',
        relevanceScore: 95,
        estimatedTraffic: 48000,
        spamScore: 1,
        editorialJustification:
          'Confederación Empresarial de Madrid; ficha de socio colaborador y ponencia en jornada de pymes.',
        anchorSuggestion: 'AsexIA',
        status: 'Negociación',
        contactEmail: 'eventos@ceim.es',
      },
      {
        id: 'bl-3',
        domain: 'emprendedores.es',
        category: 'Digital PR',
        relevanceScore: 89,
        estimatedTraffic: 320000,
        spamScore: 3,
        editorialJustification:
          'Reportaje sobre costes reales de implantar IA y CRM en microempresas españolas.',
        anchorSuggestion: 'consultora AsexIA',
        status: 'Prospecto',
        contactEmail: 'colaboraciones@emprendedores.es',
      },
      {
        id: 'bl-4',
        domain: 'camaramadrid.es',
        category: 'Directorio Sectorial',
        relevanceScore: 94,
        estimatedTraffic: 72000,
        spamScore: 1,
        editorialJustification:
          'Directorio institucional de proveedores verificados para pymes de la Comunidad de Madrid.',
        anchorSuggestion: 'https://asexia.es',
        status: 'Conseguido',
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Javier Morales',
        sede: 'Sede Madrid · Gran Vía',
        platform: 'Google Business Profile',
        channelKind: 'Reseña Local',
        rating: 5,
        date: '2026-11-19',
        comment:
          'Nos ayudaron a ordenar el CRM y optimizar la ficha local en Chamberí. En dos meses duplicamos las solicitudes por WhatsApp.',
        sentiment: 'Positivo',
        suggestedReply:
          'Muchas gracias, Javier. Nos alegra saber que la implantación del CRM y las mejoras en visibilidad local en Chamberí ya se traducen en consultas reales por WhatsApp. Seguimos trabajando cada mes en los objetivos de vuestro negocio.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-2',
        author: 'Marta Domínguez',
        sede: 'Sede Madrid · Gran Vía',
        platform: 'Trustpilot',
        channelKind: 'Portal Sectorial',
        rating: 4,
        date: '2026-11-16',
        comment:
          'Trato muy claro y transparente con los informes. El arranque de la auditoría técnica tardó un día más de lo esperado pero el resultado fue excelente.',
        sentiment: 'Neutro',
        suggestedReply:
          'Gracias por tu valoración y sinceridad, Marta. Tomamos nota sobre ese día adicional en el arranque técnico para ajustar aún más nuestros tiempos de entrega y mantener la claridad en cada informe mensual.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-3',
        author: '@pyme_sergio',
        sede: 'TikTok · Comentario en vídeo',
        platform: 'TikTok',
        channelKind: 'Comentario Social',
        rating: 2,
        date: '2026-11-21',
        comment:
          '¿El diagnóstico inicial incluye luego permanencia oculta o subida de cuota al tercer mes?',
        sentiment: 'Crítico',
        suggestedReply:
          'Hola Sergio, gracias por preguntarlo abiertamente: todos nuestros planes son sin permanencia oculta y con presupuesto por escrito antes de empezar. Si quieres, escríbenos por mensaje directo y revisamos tu caso hoy mismo.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-4',
        author: 'Lucía Roldán',
        sede: 'TripAdvisor · Experiencias Corporativas Madrid',
        platform: 'TripAdvisor',
        channelKind: 'Portal Sectorial',
        rating: 5,
        date: '2026-11-18',
        comment:
          'Contratamos el taller presencial de visibilidad local para nuestro equipo comercial en Madrid y la valoración fue sobresaliente.',
        sentiment: 'Positivo',
        suggestedReply:
          'Muchas gracias por tu valoración en TripAdvisor, Lucía. Fue un placer trabajar con vuestro equipo comercial en Madrid y ver resultados ya en la primera semana.',
        replyStatus: 'Publicada',
      },
      {
        id: 'rev-5',
        author: 'Dr. Alberto Nieto',
        sede: 'Doctoralia · Partner Clínicas Salud',
        platform: 'Doctoralia',
        channelKind: 'Portal Sectorial',
        rating: 3,
        date: '2026-11-15',
        comment:
          'La coordinación con la ficha sanitaria fue buena, aunque nos faltó recibir antes el calendario de publicación de preguntas frecuentes.',
        sentiment: 'Neutro',
        suggestedReply:
          'Gracias por tu comentario, Alberto. Hemos ajustado la entrega anticipada del calendario de FAQ médicas al inicio de cada mes para que vuestro equipo valide con mayor margen.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-6',
        author: '@comercio_chamberi',
        sede: 'Meta (Instagram/Facebook) · Comentario en Reels',
        platform: 'Meta (Instagram/Facebook)',
        channelKind: 'Comentario Social',
        rating: 1,
        date: '2026-11-20',
        comment:
          'Llevamos dos días esperando que nos confirméis por Instagram si cubrís nuestra tienda de barrio con el bono digital.',
        sentiment: 'Crítico',
        suggestedReply:
          'Sentimos mucho la demora en responder por Instagram. Ya te hemos escrito por mensaje privado para confirmar hoy mismo la elegibilidad de vuestra tienda y darte cita directa.',
        replyStatus: 'Pendiente Aprobación',
      },
    ],
    socialPosts: [
      {
        id: 'soc-1',
        articleId: 'art-1',
        channel: 'LinkedIn',
        format: 'Post Ejecutivo',
        copy: 'El 68% de las pymes en Madrid pierde leads locales por no medir llamadas ni WhatsApp desde su ficha de empresa. En nuestra nueva guía auditada explicamos cómo conectar SEO local + datos verificables en 90 días.',
        scheduledDate: '2026-11-23 10:00',
        status: 'Pendiente Aprobación',
      },
      {
        id: 'soc-2',
        articleId: 'art-1',
        channel: 'Instagram',
        format: 'Carrusel',
        copy: '5 puntos que tu pyme debe revisar antes de pedir una subvención o contratar marketing: 1. Propiedad de tu dominio. 2. Coste por lead real. 3. Reseñas con respuesta humana...',
        scheduledDate: '2026-11-25 18:30',
        status: 'Aprobada',
      },
      {
        id: 'soc-3',
        articleId: 'art-2',
        channel: 'Reddit / Quora',
        format: 'Respuesta con Divulgación',
        copy: 'Para aparecer en el bloque local de Madrid sin penalizaciones, prioriza la consistencia de dirección en registros mercantiles y responde reseñas con contexto real. (Divulgación: aportación de equipo técnico de AsexIA).',
        antiSpamNote:
          'Cumple reglas anti-spam: sin enlace promocional directo y con divulgación explícita de afiliación.',
        scheduledDate: '2026-11-24 12:00',
        status: 'Pendiente Aprobación',
      },
    ],
    auditLogs: [
      {
        id: 'log-1',
        timestamp: '2026-11-21 04:15',
        actor: 'Sistema GEO Monitor',
        role: 'Agencia',
        module: 'Monitor GEO',
        action: 'Verificación de citas IA',
        detail: 'Detectado incremento +6% Share of Voice en Gemini y Perplexity para consulta local Madrid.',
      },
      {
        id: 'log-2',
        timestamp: '2026-11-20 18:40',
        actor: 'Lucía Serrano',
        role: 'Editor',
        module: 'Contenido Humano',
        action: 'Revisión automática + flag sensible',
        detail: 'Artículo "Kit Digital 2026" marcado con verificación obligatoria por mención de importes públicos.',
      },
      {
        id: 'log-3',
        timestamp: '2026-11-19 16:20',
        actor: 'Carlos Navarro',
        role: 'Editor',
        module: 'Contenido Humano',
        action: 'Aprobación y programación',
        detail: 'Aprobado borrador "Local Pack Madrid" tras validar fuentes de Google Business Profile.',
      },
    ],
    ecosystemLinks: DEFAULT_ECOSYSTEM_LINKS.map((l) => ({ ...l })),
    clientMaster: createDefaultClientMaster({
      companyName: 'AsexIA',
      domain: 'https://asexia.es',
      city: 'Madrid',
      sector: 'Consultoría Digital Pyme',
      plan: 'Agency',
      enabledModules: ['reputacion_local', 'seo_geo', 'campanas'],
    }),
    ...createDefaultGrowthExtensions('Madrid', 'Consultoría Digital Pyme'),
    ...createDefaultReputationExtensions(
      'AsexIA',
      'https://asexia.es',
      'Madrid',
      'Consultoría Digital Pyme'
    ),
  },
  {
    id: 'proj-clinica-valencia',
    name: 'Clínica Dental Confía · Valencia',
    plan: 'Growth',
    profile: {
      companyName: 'Clínica Dental Confía Valencia',
      domain: 'https://dentalconfia.es',
      sector: 'Salud Dental e Implantología',
      country: 'España',
      primaryCity: 'Valencia',
      language: 'es-ES',
      valueProposition:
        'Odontología conservadora e implantología guiada en Valencia Eixample con presupuesto cerrado y primera revisión diagnóstica.',
      targetAudience: 'Pacientes particulares y familias en Valencia capital y área metropolitana.',
      services: [
        'Implantes Dentales Carga Inmediata',
        'Ortodoncia Invisible',
        'Estética Dental',
        'Urgencias Dentales Valencia',
      ],
      competitors: ['Clínica Ruzafa Dental', 'Instituto Odontológico Turia', 'Sonrisa Valencia'],
      yearsExperience: 14,
      certifications: [
        'Registro Sanitario Generalitat Valenciana Nº 46-2190',
        'Colegio Oficial de Odontólogos de Valencia',
      ],
      priceRange: 'Implante completo desde 1.150 € · Financiación transparente 0%',
      guarantees: 'Garantía escrita de 5 años en implantes con revisiones semestrales incluidas.',
      commercialPolicy:
        'Revisión médica humana obligatoria en todo contenido clínico. Cumplimiento estricto RGPD datos de salud.',
      forbiddenClaims: [
        'Cura garantizada sin dolor al 100%',
        'Promoción sanitaria engañosa sin número de colegiado',
      ],
      brandTone: 'Médico, empático, riguroso y tranquilizador.',
      gdprCompliant: true,
      lastAuditedAt: '2026-11-20 12:10',
    },
    kpis: {
      leadsMonth: 112,
      leadsDeltaPct: 18.2,
      cplEur: 22.1,
      estimatedRoiPct: 440,
      avgGeoGridPos: 2.3,
      aiShareOfVoicePct: 37.0,
      gbpCallsAndWhatsapp: 81,
      technicalHealthPct: 86,
    },
    roiTimeline: [
      { period: 'Jun', organicTraffic: 2100, totalLeads: 54, aiMentions: 8, cplEur: 31.0 },
      { period: 'Jul', organicTraffic: 2450, totalLeads: 65, aiMentions: 12, cplEur: 28.4 },
      { period: 'Ago', organicTraffic: 2680, totalLeads: 72, aiMentions: 15, cplEur: 26.8 },
      { period: 'Sep', organicTraffic: 3190, totalLeads: 84, aiMentions: 21, cplEur: 24.5 },
      { period: 'Oct', organicTraffic: 3720, totalLeads: 98, aiMentions: 28, cplEur: 23.0 },
      { period: 'Nov', organicTraffic: 4180, totalLeads: 112, aiMentions: 33, cplEur: 22.1 },
    ],
    geoKeywords: [
      {
        id: 'kw-v1',
        keyword: 'implantes dentales valencia eixample',
        sedeName: 'Clínica Ruzafa · Gran Vía Marqués del Turia',
        city: 'Valencia',
        radiusKm: 4,
        gridSize: 5,
        avgRank: 2.1,
        top3Pct: 80,
        visibilityScore: 87,
        monthlySearches: 1600,
        nodes: buildGridNodes(
          39.4648,
          -0.3714,
          5,
          valenciaZones,
          [3, 2, 1, 2, 4, 2, 1, 1, 1, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 4, 4, 3, 2, 3, 5],
          ['Clínica Ruzafa Dental', 'Instituto Odontológico Turia', 'Sonrisa Valencia']
        ),
      },
    ],
    postalMetrics: [
      {
        postalCode: '46005',
        district: 'Eixample · Ruzafa',
        impressions: 5890,
        clicks: 540,
        calls: 31,
        whatsappClicks: 22,
        directionRequests: 49,
        formLeads: 19,
        avgPosition: 1.3,
        conversionRate: 13.4,
      },
      {
        postalCode: '46001',
        district: 'Ciutat Vella',
        impressions: 4120,
        clicks: 332,
        calls: 16,
        whatsappClicks: 12,
        directionRequests: 28,
        formLeads: 14,
        avgPosition: 2.2,
        conversionRate: 10.8,
      },
    ],
    clusters: [
      {
        id: 'cl-v1',
        pillarTitle: 'Implantes dentales en Valencia: proceso clínico, plazos y presupuesto cerrado',
        intentScope: 'Mixto SEO + GEO',
        commercialGoal: 'Leads',
        difficulty: 39,
        estimatedVolume: 1900,
        leadPotential: 'Alto',
        dueDate: '2026-11-29',
        owner: 'Dra. Beatriz Soler',
        status: 'En Revisión',
      },
    ],
    articles: [
      {
        id: 'art-v1',
        clusterId: 'cl-v1',
        title: 'Cuándo está indicada la carga inmediata en implantes dentales y qué pruebas requiere',
        metaTitle: 'Implantes de Carga Inmediata en Valencia | Clínica Dental Confía',
        metaDescription:
          'Criterios médicos de estabilidad ósea, TAC 3D y revisión por especialista colegiado en Valencia Eixample.',
        slug: 'carga-inmediata-implantes-dentales-criterios-valencia',
        url: 'https://dentalconfia.es/tratamientos/carga-inmediata-implantes-dentales',
        intentType: 'GEO Conversacional',
        status: 'Pendiente Aprobación',
        authorHuman: 'Dra. Beatriz Soler',
        aiModel: 'gemini-4-hydrogen',
        promptSummary: 'Contenido sanitario con revisión médica obligatoria y citas SEPA.',
        originalityScore: 98,
        sensitiveClaimFlag: true,
        complianceChecked: true,
        sections: [
          {
            heading: 'Requisitos clínicos previos mediante TAC 3D',
            level: 'H2',
            body: 'No todos los casos son aptos para carga inmediata en el mismo día. La evaluación previa verifica densidad ósea y ausencia de infección periodontal activa.',
          },
        ],
        faq: [
          {
            question: '¿El estudio implantológico inicial incluye TAC 3D?',
            answer:
              'Sí, en nuestra clínica de Eixample el diagnóstico completo incluye ortopantomografía o TAC 3D según indicación clínica.',
          },
        ],
        ctaText: 'Reserva valoración médica presencial en Valencia',
        jsonLdType: 'Service',
        jsonLdCode: JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': 'MedicalClinic',
            name: 'Clínica Dental Confía Valencia',
          },
          null,
          2
        ),
        internalLinks: ['/equipo-medico', '/implantes-dentales-valencia'],
        sources: [
          {
            title: 'Sociedad Española de Periodoncia (SEPA)',
            url: 'https://www.sepa.es',
            verified: true,
          },
        ],
        imageSuggestion: {
          altText: 'Equipo de implantología revisando TAC dental 3D en Clínica Dental Confía Valencia',
          description: 'Imagen clínica profesional con consentimiento.',
        },
        estimatedLeadsMonth: 22,
      },
    ],
    aiQueries: [
      {
        id: 'geoq-v1',
        query: '¿Qué clínica dental recomiendas en Valencia Eixample para implantes con garantía?',
        category: 'Local',
        brandAppears: true,
        shareOfVoicePct: 39,
        competitorsMentioned: ['Clínica Ruzafa Dental'],
        engines: [
          {
            engine: 'ChatGPT',
            mentioned: true,
            position: 2,
            sentiment: 'Positivo',
            citedUrls: ['https://dentalconfia.es'],
          },
          {
            engine: 'Perplexity',
            mentioned: true,
            position: 3,
            sentiment: 'Positivo',
            citedUrls: ['https://dentalconfia.es/implantes'],
          },
          {
            engine: 'Gemini',
            mentioned: true,
            position: 2,
            sentiment: 'Positivo',
            citedUrls: ['https://dentalconfia.es'],
          },
          {
            engine: 'Claude',
            mentioned: false,
            position: null,
            sentiment: 'Ausente',
            citedUrls: [],
          },
        ],
        missingContentOpportunity: 'Añadir página de garantías escritas y número de registro sanitario visible.',
        lastCheckedAt: '2026-11-20 15:00',
        trendHistory: [
          { period: 'Ago', shareOfVoicePct: 45, queryVolumeIndex: 82 },
          { period: 'Sep', shareOfVoicePct: 43, queryVolumeIndex: 79 },
          { period: 'Oct', shareOfVoicePct: 41, queryVolumeIndex: 75 },
          { period: 'Nov', shareOfVoicePct: 39, queryVolumeIndex: 71 },
        ],
        forecastedDropPct: -14.2,
        forecastReason:
          'Descenso gradual de citas frente a clínicas con garantías y registro sanitario estructurado en Schema.',
      },
    ],
    technicalIssues: [
      {
        id: 'tech-v1',
        url: '/tratamientos/ortodoncia-invisible',
        category: 'Schema Markup',
        title: 'Falta marcado MedicalWebPage con revisor colegiado',
        recommendation: 'Incluir autor/revisor médico y fecha de última revisión clínica en JSON-LD.',
        impact: 'Alto',
        effort: 'Bajo',
        status: 'Pendiente',
        detectedAt: '2026-11-20',
      },
    ],
    backlinks: [
      {
        id: 'bl-v1',
        domain: 'lasprovincias.es',
        category: 'Prensa Local',
        relevanceScore: 91,
        estimatedTraffic: 210000,
        spamScore: 2,
        editorialJustification: 'Suplemento Salud Valencia; artículo divulgativo sobre higiene e implantología.',
        anchorSuggestion: 'Clínica Dental Confía',
        status: 'Prospecto',
      },
    ],
    reviews: [
      {
        id: 'rev-v1',
        author: 'Carmen Ferrer',
        sede: 'Clínica Ruzafa',
        platform: 'Google Business Profile',
        channelKind: 'Reseña Local',
        rating: 5,
        date: '2026-11-18',
        comment: 'Explicaron cada paso del presupuesto antes de empezar y el seguimiento tras el implante fue impecable.',
        sentiment: 'Positivo',
        suggestedReply:
          'Muchas gracias, Carmen. Para todo el equipo médico es prioritario que comprendas cada etapa y te sientas acompañada en las revisiones.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-v2',
        author: 'Jorge M.',
        sede: 'Doctoralia · Ficha Especialista',
        platform: 'Doctoralia',
        channelKind: 'Portal Sectorial',
        rating: 2,
        date: '2026-11-21',
        comment: 'La atención médica fue buena pero no quedaba claro en el anuncio si el TAC 3D estaba incluido en la financiación sin intereses.',
        sentiment: 'Crítico',
        suggestedReply:
          'Gracias por trasladarnos tu observación, Jorge. Para nosotros la transparencia presupuestaria es clave: por favor contáctanos en recepción para revisar el desglose cerrado de tu estudio clínico.',
        replyStatus: 'Pendiente Aprobación',
      },
      {
        id: 'rev-v3',
        author: 'Beatriz Navas',
        sede: 'Trustpilot · Clínica Valencia',
        platform: 'Trustpilot',
        channelKind: 'Portal Sectorial',
        rating: 4,
        date: '2026-11-17',
        comment: 'Muy satisfechos con la ortodoncia invisible. La cita de revisión se retrasó 15 minutos, pero el trato de la doctora compensó con creces.',
        sentiment: 'Neutro',
        suggestedReply:
          'Gracias por compartir tu experiencia en Trustpilot, Beatriz. Tomamos nota de esos 15 minutos de espera para seguir afinando nuestra puntualidad en agenda.',
        replyStatus: 'Publicada',
      },
      {
        id: 'rev-v4',
        author: '@valencia_sonrie',
        sede: 'YouTube · Comentario en vídeo clínico',
        platform: 'YouTube',
        channelKind: 'Comentario Social',
        rating: 2,
        date: '2026-11-20',
        comment: 'En el vídeo habláis de carga inmediata en 24h pero a mí me dijeron que necesitaba esperar 3 semanas por falta de hueso.',
        sentiment: 'Crítico',
        suggestedReply:
          'Hola, gracias por tu comentario. La carga inmediata en 24h depende siempre de la densidad ósea valorada en el TAC 3D previo para garantizar seguridad clínica. Si quieres revisar tu caso sin compromiso, escríbenos a recepción.',
        replyStatus: 'Pendiente Aprobación',
      },
    ],
    socialPosts: [
      {
        id: 'soc-v1',
        articleId: 'art-v1',
        channel: 'Instagram',
        format: 'Carrusel',
        copy: '¿Qué analiza el especialista antes de indicar un implante de carga inmediata? Te explicamos el protocolo clínico en 4 pasos (contenido revisado por Dra. Soler, col. 46002819).',
        scheduledDate: '2026-11-26 11:00',
        status: 'Pendiente Aprobación',
      },
    ],
    auditLogs: [
      {
        id: 'log-v1',
        timestamp: '2026-11-20 12:10',
        actor: 'Dra. Beatriz Soler',
        role: 'Propietario',
        module: 'Contenido Humano',
        action: 'Validación sanitaria requerida',
        detail: 'Activado bloqueo automático de publicación sin firma médica en artículos de salud.',
      },
    ],
    ecosystemLinks: DEFAULT_ECOSYSTEM_LINKS.map((l, i) => ({
      ...l,
      syncedRecords: i === 0 ? 112 : i === 1 ? 8 : 0,
    })),
    clientMaster: createDefaultClientMaster({
      companyName: 'Clínica Dental Confía Valencia',
      domain: 'https://dentalconfia.es',
      city: 'Valencia',
      sector: 'Salud Dental e Implantología',
      plan: 'Growth',
      enabledModules: ['reputacion_local', 'seo_geo', 'campanas'],
    }),
    ...createDefaultGrowthExtensions('Valencia', 'Salud Dental e Implantología'),
    ...createDefaultReputationExtensions(
      'Clínica Dental Confía Valencia',
      'https://dentalconfia.es',
      'Valencia',
      'Salud Dental e Implantología'
    ),
  },
];

export const INITIAL_STORE: StoreState = {
  activeProjectId: 'proj-mundoconfia',
  activeRole: 'Agencia',
  projects: INITIAL_PROJECTS,
  releaseNotes: DEFAULT_RELEASE_NOTES,
  dismissedReleaseNotesByRole: {},
};
