import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';

const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/logo%202kx1k.png"; 
const QR_IMG = "https://sxytesbgnwouwmfglxtw.supabase.co/storage/v1/object/public/fotos-taller/qr-code%20(2).png";
const SURVEY_URL = "https://tally.so/r/Zj6jQe";

const getStyles = (modo) => {
  const colorPrincipal = modo === 'impresion' ? '#000000' : '#1e3a8a'; 
  const fondoCajas = modo === 'impresion' ? '#ffffff' : '#f9fafb'; 
  const bordeCajas = modo === 'impresion' ? '#000000' : '#e5e7eb';

  return StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#111', paddingBottom: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 5, alignItems: 'center' },
    logoImage: { width: 160, height: 80, objectFit: 'contain', alignSelf: 'flex-start' },
    subLogo: { fontSize: 8, color: '#666', marginTop: 0 },
    meta: { textAlign: 'right' },
    metaTitle: { fontSize: 12, fontWeight: 'bold', color: colorPrincipal },
    
    // CAJAS INFO BASICA
    infoContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    infoBox: { flex: 1, backgroundColor: fondoCajas, borderWidth: 1, borderColor: bordeCajas, borderRadius: 4, padding: 8 },
    infoLabel: { fontSize: 7, color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 10, color: '#000', marginBottom: 2, fontWeight: 'bold' },
    infoSub: { fontSize: 8, color: '#444' },

    // VITALES & RECEPCIÓN
    gridVitales: { flexDirection: 'row', gap: 5, marginBottom: 15 },
    boxVital: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 6, alignItems: 'center' },
    vitalLabel: { fontSize: 7, fontWeight: 'bold', color: '#666', marginBottom: 3, textAlign: 'center' },
    vitalText: { fontSize: 9, fontWeight: 'bold', color: '#000', textAlign: 'center' },
    
    combustibleBar: { height: 4, backgroundColor: '#eee', borderRadius: 2, marginTop: 4, width: '90%' },
    combustibleFill: { height: '100%', backgroundColor: colorPrincipal, borderRadius: 2 },
    obsRecepcion: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 6, marginBottom: 15 },

    // TABLAS (Servicios y Checklist)
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: colorPrincipal, marginBottom: 5, marginTop: 10, borderBottomWidth: 1, borderBottomColor: colorPrincipal, paddingBottom: 2 },
    tableHeader: { flexDirection: 'row', backgroundColor: modo === 'impresion' ? '#ddd' : colorPrincipal, padding: 5, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { color: modo === 'impresion' ? '#000' : '#fff', fontSize: 8, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 5, alignItems: 'center' },
    
    // Anchos Servicios
    colSrvMain: { width: '80%' }, 
    colSrvVal: { width: '20%', textAlign: 'right' }, 
    
    // Anchos Checklist
    colChkName: { width: '40%', fontSize: 9, fontWeight: 'bold' },
    colChkStatus: { width: '15%', fontSize: 8, fontWeight: 'bold', textAlign: 'center' },
    colChkObs: { width: '45%', fontSize: 8, color: '#555', fontStyle: 'italic' },
    catHeader: { backgroundColor: '#f3f4f6', padding: 4, marginTop: 4, fontSize: 9, fontWeight: 'bold', color: '#374151' },

    // ESTADOS CHECKLIST (Para el modo digital)
    stOk: { color: '#16a34a' }, // Verde
    stObs: { color: '#ca8a04' }, // Naranja
    stFail: { color: '#dc2626' }, // Rojo
    stNull: { color: '#9ca3af' }, // Gris
    stPrint: { color: '#000000' }, // Negro para impresión

    // GALERÍA
    photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    photoBox: { width: '31%', borderWidth: 1, borderColor: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
    photoImage: { width: '100%', height: 100, objectFit: 'cover' },
    photoLabel: { fontSize: 7, padding: 3, textAlign: 'center', backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#eee', fontWeight: 'bold', color: '#444' },

    // TOTALES
    footerContainer: { marginTop: 15, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start' },
    totalBox: { width: modo === 'impresion' ? '40%' : '45%', borderTopWidth: 2, borderTopColor: colorPrincipal, paddingTop: 5, marginLeft: 'auto' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    totalLarge: { fontSize: 14, fontWeight: 'bold', color: colorPrincipal, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 4, marginTop: 4 },
    
    // FIRMAS DOBLES (Solo Impresión)
    firmasContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50, paddingHorizontal: 20 },
    firmaBox: { width: '40%', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5, alignItems: 'center' },
    firmaLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
    firmaName: { fontSize: 8, color: '#666' },

    surveyBox: { marginTop: 20, padding: 10, borderWidth: 1, borderColor: modo === 'impresion' ? '#000' : '#bbf7d0', backgroundColor: modo === 'impresion' ? '#fff' : '#f0fdf4', borderRadius: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    surveyLink: { fontSize: 8, color: colorPrincipal, textDecoration: 'underline', fontWeight: 'bold' },
    qrImage: { width: 40, height: 40 },
    pageFooter: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#666', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 }
  });
};

const OrdenPDF = ({ orden, modo = 'digital' }) => {
  if (!orden || !orden.vehiculo) return <Document><Page size="A4"><Text>Cargando...</Text></Page></Document>;

  const styles = getStyles(modo); 
  const { vehiculo, reparaciones, fotos, inspeccion, total, impuestos } = orden;
  const fecha = vehiculo.fecha || new Date().toLocaleDateString('es-CL');
  const money = (val) => '$ ' + (parseInt(val) || 0).toLocaleString('es-CL');

  // Recopilar fotos (Solo se usan si el modo es digital)
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
    if (modo === 'impresion') return styles.stPrint; // En B/N todo es negro/gris oscuro
    if (st === 'ok') return styles.stOk;
    if (st === 'atencion') return styles.stObs;
    if (st === 'malo') return styles.stFail;
    return styles.stNull;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ width: '60%' }}>
            <Image src={LOGO_URL} style={styles.logoImage} />
            <Text style={styles.subLogo}>Frankfort 5030, San Miguel</Text>
            <Text style={styles.subLogo}>+56 9 8776 3347</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{modo === 'impresion' ? 'ORDEN DE TRABAJO' : 'INFORME TÉCNICO Y COTIZACIÓN'}</Text>
            <Text style={{ marginTop: 4 }}>Folio #{vehiculo.orden}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>{fecha}</Text>
          </View>
        </View>

        {/* CLIENTE Y VEHÍCULO */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>CLIENTE</Text>
            <Text style={styles.infoValue}>{vehiculo.cliente || 'Sin Nombre'}</Text>
            <Text style={styles.infoSub}>RUT: {vehiculo.rut || '---'} | Tel: {vehiculo.telefono || '---'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>VEHÍCULO</Text>
            <Text style={styles.infoValue}>{vehiculo.patente || '---'} ({vehiculo.anio || '---'})</Text>
            <Text style={styles.infoSub}>{vehiculo.marca} {vehiculo.modelo} | VIN: {vehiculo.vin || '---'}</Text>
          </View>
        </View>

        {/* VITALES Y RECEPCIÓN */}
        <View style={styles.gridVitales} wrap={false}>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>KILOMETRAJE</Text>
            <Text style={styles.vitalText}>{vehiculo.km} KM</Text>
          </View>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>COMBUSTIBLE ({vehiculo.combustible}%)</Text>
            <View style={styles.combustibleBar}>
              <View style={[styles.combustibleFill, { width: `${vehiculo.combustible}%` }]} />
            </View>
          </View>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>BATERÍA (MES/AÑO)</Text>
            <Text style={styles.vitalText}>{vehiculo.bateria}</Text>
          </View>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>NEUMÁTICOS (DEL)</Text>
            <Text style={[styles.vitalText, {fontSize: 7}]}>{vehiculo.dot_del}</Text>
          </View>
          <View style={styles.boxVital}>
            <Text style={styles.vitalLabel}>NEUMÁTICOS (TRAS)</Text>
            <Text style={[styles.vitalText, {fontSize: 7}]}>{vehiculo.dot_tras}</Text>
          </View>
        </View>

        {vehiculo.observaciones && (
          <View style={styles.obsRecepcion} wrap={false}>
            <Text style={styles.infoLabel}>NOTAS DE RECEPCIÓN / DAÑOS AL INGRESAR</Text>
            <Text style={{ fontSize: 8, color: '#444', marginTop: 2 }}>{vehiculo.observaciones}</Text>
          </View>
        )}

        {/* --- CHECKLIST DE INSPECCIÓN (Si existe) --- */}
        {inspeccion && inspeccion.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>1. RESULTADOS DE INSPECCIÓN TÉCNICA</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colChkName]}>PUNTO DE INSPECCIÓN</Text>
              <Text style={[styles.th, styles.colChkStatus]}>ESTADO</Text>
              <Text style={[styles.th, styles.colChkObs]}>OBSERVACIÓN TÉCNICA</Text>
            </View>

            {inspeccion.map((cat, i) => (
              <View key={i} wrap={false}>
                <View style={styles.catHeader}><Text>{cat.titulo}</Text></View>
                {cat.items.map((item, j) => (
                  <View key={j} style={styles.tableRow}>
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
              <Text style={[styles.th, styles.colSrvMain]}>DESCRIPCIÓN</Text>
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

        {/* TOTALES */}
        <View style={styles.footerContainer} wrap={false}>
          <View style={styles.totalBox}>
            <View style={[styles.totalRow, { marginTop: 5 }]}>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>TOTAL A PAGAR</Text>
              <Text style={styles.totalLarge}>{money(total)}</Text>
            </View>
          </View>
        </View>

        {/* --- DOBLE FIRMA PARA MODO IMPRESIÓN --- */}
        {modo === 'impresion' && (
          <View style={styles.firmasContainer} wrap={false}>
            <View style={styles.firmaBox}>
              <Text style={styles.firmaLabel}>FIRMA CLIENTE Y ACEPTACIÓN</Text>
              <Text style={styles.firmaName}>{vehiculo.cliente}</Text>
              <Text style={styles.firmaName}>RUT: {vehiculo.rut || '___________'}</Text>
            </View>
            <View style={styles.firmaBox}>
              <Text style={styles.firmaLabel}>FIRMA TÉCNICO RESPONSABLE</Text>
              <Text style={styles.firmaName}>{vehiculo.tecnico}</Text>
              <Text style={styles.firmaName}>Taller Multifrenos</Text>
            </View>
          </View>
        )}

        {/* --- GALERÍA TÉCNICA (FOTOS) - SÓLO MODO DIGITAL --- */}
        {modo === 'digital' && todasLasFotos.length > 0 && (
          <View style={{ marginTop: 20 }} break={todasLasFotos.length > 3}>
            <Text style={styles.sectionTitle}>EVIDENCIA FOTOGRÁFICA</Text>
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
            <Text style={{ fontSize: 8, color: '#333', marginBottom: 3 }}>¿Qué te pareció nuestro servicio? Ayúdanos a mejorar.</Text>
            <Text style={{ fontWeight: 'bold', color: modo === 'impresion' ? '#000' : '#166534', fontSize: 10 }}>10% DE DESCUENTO EN TU PRÓXIMO SERVICIO</Text>
            {modo === 'digital' ? (
              <Link src={SURVEY_URL} style={[styles.surveyLink, {marginTop: 2}]}>CLICK AQUÍ PARA RESPONDER</Link>
            ) : (
              <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>ESCANEA EL CÓDIGO QR PARA CANJEAR EL DESCUENTO ➜</Text>
            )}
          </View>
          <Image src={QR_IMG} style={styles.qrImage} />
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.pageFooter} fixed>
          <Text>{modo === 'impresion' ? 'Orden de Trabajo generada por Multifrenos.' : 'Informe Técnico y Cotización generada por Multifrenos.'} Excluye daños por mal uso o intervención de terceros.</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} style={{ marginTop: 2, fontSize: 6 }} />
        </View>

      </Page>
    </Document>
  );
};

export default OrdenPDF;