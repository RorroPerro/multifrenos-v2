import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';

const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/logo%202kx1k.png"; 
const QR_IMG = "https://sxytesbgnwouwmfglxtw.supabase.co/storage/v1/object/public/fotos-taller/qr-code%20(2).png";
const SURVEY_URL = "https://tally.so/r/Zj6jQe";

const getStyles = (modo) => {
  const colorPrincipal = modo === 'impresion' ? '#000000' : '#1e3a8a'; 
  const fondoCajas = modo === 'impresion' ? '#ffffff' : '#f8fafc'; 
  const bordeCajas = modo === 'impresion' ? '#000000' : '#e2e8f0';

  return StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#1e293b', paddingBottom: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 2, borderBottomColor: colorPrincipal, paddingBottom: 10, alignItems: 'flex-start' },
    logoImage: { width: 140, height: 60, objectFit: 'contain', alignSelf: 'flex-start' },
    subLogo: { fontSize: 8, color: '#64748b', marginTop: 2 },
    meta: { textAlign: 'right' },
    metaTitle: { fontSize: 14, fontWeight: 'bold', color: colorPrincipal, marginBottom: 2 },
    
    // CAJAS INFO BASICA
    infoContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    infoBox: { flex: 1, backgroundColor: fondoCajas, borderWidth: 1, borderColor: bordeCajas, borderRadius: 6, padding: 10 },
    infoLabel: { fontSize: 7, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
    infoValue: { fontSize: 11, color: '#0f172a', marginBottom: 3, fontWeight: 'bold' },
    infoSub: { fontSize: 8, color: '#475569' },

    // VITALES & RECEPCIÓN
    gridVitales: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    boxVital: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: bordeCajas, borderRadius: 6, padding: 10, alignItems: 'center' },
    vitalLabel: { fontSize: 7, fontWeight: 'bold', color: '#64748b', marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
    vitalText: { fontSize: 14, fontWeight: 'bold', color: colorPrincipal, textAlign: 'center' },
    
    combustibleBar: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginTop: 4, width: '90%', overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    combustibleFill: { height: '100%', backgroundColor: colorPrincipal },
    obsRecepcion: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, marginBottom: 15 },

    // TABLAS (Servicios y Checklist)
    sectionTitle: { fontSize: 10, fontWeight: 'bold', color: colorPrincipal, marginBottom: 8, marginTop: 15, borderBottomWidth: 1, borderBottomColor: bordeCajas, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
    tableHeader: { flexDirection: 'row', backgroundColor: modo === 'impresion' ? '#e2e8f0' : colorPrincipal, padding: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { color: modo === 'impresion' ? '#0f172a' : '#ffffff', fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', padding: 6, alignItems: 'center' },
    
    // Anchos Servicios
    colSrvMain: { width: '80%' }, 
    colSrvVal: { width: '20%', textAlign: 'right', fontWeight: 'bold' }, 
    
    // Anchos Checklist
    colChkName: { width: '40%', fontSize: 9, fontWeight: 'bold' },
    colChkStatus: { width: '15%', fontSize: 8, fontWeight: 'bold', textAlign: 'center' },
    colChkObs: { width: '45%', fontSize: 8, color: '#475569', fontStyle: 'italic' },
    catHeader: { backgroundColor: '#f8fafc', padding: 6, marginTop: 6, fontSize: 9, fontWeight: 'bold', color: '#334155', borderLeftWidth: 3, borderLeftColor: colorPrincipal },

    // ESTADOS CHECKLIST (Jerarquía Visual)
    stOk: { color: '#16a34a' }, // Verde
    stObs: { color: '#ca8a04' }, // Naranja
    stFail: { color: '#dc2626' }, // Rojo
    stNull: { color: '#94a3b8' }, // Gris
    stPrint: { color: '#000000' }, 
    
    rowOk: { opacity: 0.7 }, // Atenuar las filas que están bien para resaltar los problemas
    rowAlert: { backgroundColor: modo === 'impresion' ? '#fff' : '#fef2f2' }, // Fondo rojizo suave a los fallos en digital

    // GALERÍA
    photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    photoBox: { width: '31%', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
    photoImage: { width: '100%', height: 110, objectFit: 'cover' },
    photoLabel: { fontSize: 7, padding: 4, textAlign: 'center', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', fontWeight: 'bold', color: '#475569' },

    // TOTALES
    footerContainer: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start' },
    totalBox: { width: modo === 'impresion' ? '45%' : '50%', backgroundColor: fondoCajas, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: bordeCajas },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },
    totalValue: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
    totalLargeLine: { borderTopWidth: 1, borderTopColor: '#cbd5e1', marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLargeText: { fontSize: 11, fontWeight: 'bold', color: colorPrincipal },
    totalLargeAmount: { fontSize: 16, fontWeight: 'bold', color: colorPrincipal },
    
    // FIRMAS DOBLES (Solo Impresión)
    firmasContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60, paddingHorizontal: 20 },
    firmaBox: { width: '40%', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 6, alignItems: 'center' },
    firmaLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
    firmaName: { fontSize: 8, color: '#64748b' },

    surveyBox: { marginTop: 25, padding: 12, borderWidth: 1, borderColor: modo === 'impresion' ? '#000' : '#86efac', backgroundColor: modo === 'impresion' ? '#fff' : '#f0fdf4', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    surveyLink: { fontSize: 9, color: '#166534', textDecoration: 'underline', fontWeight: 'bold' },
    qrImage: { width: 45, height: 45 },
    pageFooter: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }
  });
};

const OrdenPDF = ({ orden, modo = 'digital' }) => {
  if (!orden || !orden.vehiculo) return <Document><Page size="A4"><Text>Generando documento...</Text></Page></Document>;

  const styles = getStyles(modo); 
  const { vehiculo, reparaciones, fotos, inspeccion, total, impuestos } = orden;
  const fecha = vehiculo.fecha || new Date().toLocaleDateString('es-CL');
  
  // Utilidad de formato de dinero
  const money = (val) => '$ ' + (parseInt(val) || 0).toLocaleString('es-CL');
  
  // Cálculo de Subtotal e IVA real
  const hasIva = (impuestos || 0) > 0;
  const subtotal = total - impuestos;

  const fotosChecklist = [];
  if (inspeccion) {
    inspeccion.forEach(cat => {
      cat.items.forEach(item => {
        if (item.foto) {
          fotosChecklist.push({ titulo: `${cat.titulo}: ${item.nombre}`, url: item.foto });
        }
      });
    });
  }

  const todasLasFotos = [
    ...fotosChecklist,
    ...(fotos || []).map(f => ({ titulo: 'Evidencia General', url: f.url }))
  ];

  const getStatusLabel = (st) => {
    if (st === 'ok') return 'OK';
    if (st === 'atencion') return 'ATENCIÓN';
    if (st === 'malo') return 'RECHAZADO';
    return '-';
  };

  const getStatusStyle = (st) => {
    if (modo === 'impresion') return styles.stPrint; 
    if (st === 'ok') return styles.stOk;
    if (st === 'atencion') return styles.stObs;
    if (st === 'malo') return styles.stFail;
    return styles.stNull;
  };

  const getRowStyle = (st) => {
    if (modo === 'impresion') return {};
    if (st === 'ok') return styles.rowOk;
    if (st === 'malo') return styles.rowAlert;
    return {};
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ width: '60%' }}>
            <Image src={LOGO_URL} style={styles.logoImage} />
            <Text style={styles.subLogo}>Frankfort 5030, San Miguel, Santiago</Text>
            <Text style={styles.subLogo}>+56 9 8776 3347 | multifrenosspa@gmail.com</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{modo === 'impresion' ? 'ORDEN DE TRABAJO' : 'COTIZACIÓN / INFORME TÉCNICO'}</Text>
            <Text style={{ marginTop: 2, fontSize: 10 }}>Folio #{vehiculo.orden}</Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Emitido: {fecha}</Text>
          </View>
        </View>

        {/* CLIENTE Y VEHÍCULO */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>DATOS DEL CLIENTE</Text>
            <Text style={styles.infoValue}>{vehiculo.cliente || 'Sin Nombre'}</Text>
            <Text style={styles.infoSub}>RUT: {vehiculo.rut || '---'} | Tel: {vehiculo.telefono || '---'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>DATOS DEL VEHÍCULO</Text>
            <Text style={styles.infoValue}>{vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio || '---'})</Text>
            <Text style={styles.infoSub}>Patente: {vehiculo.patente || '---'} | VIN: {vehiculo.vin || '---'}</Text>
          </View>
        </View>

        {/* VITALES & RECEPCIÓN */}
        <View style={styles.gridVitales} wrap={false}>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>ODÓMETRO (KILOMETRAJE)</Text>
            <Text style={styles.vitalText}>{parseInt(vehiculo.km).toLocaleString('es-CL')} KM</Text>
          </View>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>NIVEL DE COMBUSTIBLE ({vehiculo.combustible}%)</Text>
            <View style={styles.combustibleBar}>
              <View style={[styles.combustibleFill, { width: `${vehiculo.combustible}%` }]} />
            </View>
          </View>
        </View>

        {vehiculo.observaciones && (
          <View style={styles.obsRecepcion} wrap={false}>
            <Text style={styles.infoLabel}>OBSERVACIONES DE INGRESO / MOTIVO DE VISITA</Text>
            <Text style={{ fontSize: 9, color: '#334155', marginTop: 2, lineHeight: 1.4 }}>{vehiculo.observaciones}</Text>
          </View>
        )}

        {/* --- CHECKLIST DE INSPECCIÓN --- */}
        {inspeccion && inspeccion.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>1. RESULTADOS DE INSPECCIÓN VISUAL</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colChkName]}>PUNTO DE INSPECCIÓN</Text>
              <Text style={[styles.th, styles.colChkStatus]}>ESTADO</Text>
              <Text style={[styles.th, styles.colChkObs]}>NOTAS DEL MECÁNICO</Text>
            </View>

            {inspeccion.map((cat, i) => (
              <View key={i} wrap={false}>
                <View style={styles.catHeader}><Text>{cat.titulo}</Text></View>
                {cat.items.map((item, j) => (
                  <View key={j} style={[styles.tableRow, getRowStyle(item.estado)]}>
                    <Text style={styles.colChkName}>• {item.nombre}</Text>
                    <Text style={[styles.colChkStatus, getStatusStyle(item.estado)]}>
                      {getStatusLabel(item.estado)}
                    </Text>
                    <Text style={styles.colChkObs}>{item.observacion || '-'}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* --- PRESUPUESTO / SERVICIOS --- */}
        {reparaciones && reparaciones.length > 0 && (
          <View style={{ marginTop: 15 }} wrap={false}>
            <Text style={styles.sectionTitle}>{inspeccion ? '2.' : '1.'} DETALLE DE SERVICIOS Y REPUESTOS</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colSrvMain]}>DESCRIPCIÓN DEL CARGO</Text>
              <Text style={[styles.th, styles.colSrvVal]}>VALOR</Text>
            </View>

            {reparaciones.map((rep, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colSrvMain}>{rep.texto}</Text>
                <Text style={styles.colSrvVal}>{rep.precio > 0 ? money(rep.precio) : '-'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TOTALES (Con Desglose de IVA si aplica) */}
        <View style={styles.footerContainer} wrap={false}>
          <View style={styles.totalBox}>
            {hasIva && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SUBTOTAL SERVICIOS</Text>
                  <Text style={styles.totalValue}>{money(subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>I.V.A (19%)</Text>
                  <Text style={styles.totalValue}>{money(impuestos)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalLargeLine}>
              <Text style={styles.totalLargeText}>TOTAL A PAGAR</Text>
              <Text style={styles.totalLargeAmount}>{money(total)}</Text>
            </View>
          </View>
        </View>

        {/* --- DOBLE FIRMA PARA MODO IMPRESIÓN --- */}
        {modo === 'impresion' && (
          <View style={styles.firmasContainer} wrap={false}>
            <View style={styles.firmaBox}>
              <Text style={styles.firmaLabel}>ACEPTACIÓN CLIENTE</Text>
              <Text style={styles.firmaName}>{vehiculo.cliente}</Text>
              <Text style={styles.firmaName}>RUT: {vehiculo.rut || '___________'}</Text>
            </View>
            <View style={styles.firmaBox}>
              <Text style={styles.firmaLabel}>ENTREGA TÉCNICA</Text>
              <Text style={styles.firmaName}>{vehiculo.tecnico}</Text>
              <Text style={styles.firmaName}>Taller Multifrenos</Text>
            </View>
          </View>
        )}

        {/* --- GALERÍA TÉCNICA (FOTOS) - SÓLO MODO DIGITAL --- */}
        {modo === 'digital' && todasLasFotos.length > 0 && (
          <View style={{ marginTop: 20 }} break={todasLasFotos.length > 3}>
            <Text style={styles.sectionTitle}>EVIDENCIA FOTOGRÁFICA DE RESPALDO</Text>
            <View style={styles.photosGrid}>
              {todasLasFotos.map((foto, index) => (
                <View key={index} style={styles.photoBox} wrap={false}>
                  <Image src={foto.url} style={styles.photoImage} />
                  <Text style={styles.photoLabel}>{foto.titulo.substring(0, 45)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CAJA DE ENCUESTA Y DESCUENTO */}
        <View style={styles.surveyBox} wrap={false}>
          <View style={{ width: '80%' }}>
            <Text style={{ fontSize: 8, color: '#334155', marginBottom: 4 }}>¿Qué te pareció nuestro servicio? Ayúdanos a seguir mejorando.</Text>
            <Text style={{ fontWeight: 'bold', color: modo === 'impresion' ? '#000' : '#166534', fontSize: 10, letterSpacing: 0.5 }}>10% DE DSCTO. EN TU PRÓXIMA VISITA</Text>
            {modo === 'digital' ? (
              <Link src={SURVEY_URL} style={[styles.surveyLink, {marginTop: 3}]}>HAGA CLIC AQUÍ PARA EVALUARNOS ➜</Link>
            ) : (
              <Text style={{ fontSize: 7, color: '#64748b', marginTop: 3 }}>ESCANEA EL CÓDIGO QR CON TU CÁMARA PARA CANJEAR</Text>
            )}
          </View>
          <Image src={QR_IMG} style={styles.qrImage} />
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.pageFooter} fixed>
          <Text>{modo === 'impresion' ? 'Orden de Trabajo generada por plataforma Multifrenos.' : 'Informe Técnico y Cotización generada por plataforma Multifrenos.'} Excluye daños por mal uso o intervención de terceros.</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} style={{ marginTop: 3, fontSize: 6, fontWeight: 'bold' }} />
        </View>

      </Page>
    </Document>
  );
};

export default OrdenPDF;