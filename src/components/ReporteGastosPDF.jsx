import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/logo%202kx1k.png"; 

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#1e293b', paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 10, alignItems: 'flex-start' },
  logoImage: { width: 140, height: 60, objectFit: 'contain', alignSelf: 'flex-start' },
  subLogo: { fontSize: 8, color: '#64748b', marginTop: 2 },
  meta: { textAlign: 'right' },
  metaTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 2, textTransform: 'uppercase' }, // Removido letterSpacing
  
  // CAJA INFO CLIENTE/EMPRESA
  infoBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 12, marginBottom: 20 },
  infoLabel: { fontSize: 8, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }, // Removido letterSpacing
  infoValue: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: 2 },
  infoSub: { fontSize: 9, color: '#475569' },
  
  // TABLA DE GASTOS
  tableContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e3a8a', padding: 8 },
  th: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' }, // Removido letterSpacing
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 8, alignItems: 'center' },
  tableRowZebra: { backgroundColor: '#f8fafc' },
  
  col1: { width: '15%' }, // Fecha
  col2: { width: '15%' }, // Folio
  col3: { width: '35%' }, // Vehículos
  col4: { width: '15%', textAlign: 'center' }, // Estado Pago
  col5: { width: '20%', textAlign: 'right' }, // Total
  
  tdText: { fontSize: 9, color: '#334155' },
  tdBold: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
  
  // ETIQUETAS DE ESTADO
  badgePagado: { color: '#16a34a', fontSize: 8, fontWeight: 'bold' },
  badgePendiente: { color: '#dc2626', fontSize: 8, fontWeight: 'bold' },

  // TOTALES (Ajustados para evitar solapamiento)
  summaryContainer: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  totalBox: { width: '50%', backgroundColor: '#f8fafc', padding: 14, borderRadius: 6, borderWidth: 1, borderColor: '#1e3a8a' }, // Ensanchado a 50% y más padding
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }, // Removido letterSpacing
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  
  // FOOTER
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }
});

const ReporteGastosPDF = ({ cliente, ordenes, totalGastado }) => {
  const money = (val) => '$ ' + (parseInt(val) || 0).toLocaleString('es-CL');
  const fechaHoy = new Date().toLocaleDateString('es-CL');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ width: '60%' }}>
            <Image src={LOGO_URL} style={styles.logoImage} />
            <Text style={styles.subLogo}>Frankfort 5030, San Miguel, Santiago</Text>
            <Text style={styles.subLogo}>+56 9 8776 3347 | multifrenos@gmail.com</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>REPORTE DE GASTOS</Text>
            <Text style={{ marginTop: 2, fontSize: 9, color: '#64748b' }}>Emitido: {fechaHoy}</Text>
          </View>
        </View>

        {/* DATOS DEL CLIENTE / EMPRESA */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>ESTADO DE CUENTA PARA:</Text>
          <Text style={styles.infoValue}>{cliente?.nombre}</Text>
          <Text style={styles.infoSub}>
            RUT: {cliente?.rut || 'Sin registrar'} | Tel: {cliente?.telefono || 'Sin registrar'}
          </Text>
        </View>

        {/* TABLA DE ÓRDENES */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>FECHA</Text>
            <Text style={[styles.th, styles.col2]}>Nº ORDEN</Text>
            <Text style={[styles.th, styles.col3]}>VEHÍCULOS ASOCIADOS</Text>
            <Text style={[styles.th, styles.col4]}>ESTADO</Text>
            <Text style={[styles.th, styles.col5]}>MONTO</Text>
          </View>

          {(!ordenes || ordenes.length === 0) && (
            <Text style={{padding: 15, textAlign: 'center', fontSize: 10, color: '#64748b'}}>No hay historial de órdenes facturables para este cliente.</Text>
          )}

          {ordenes?.map((orden, index) => {
            const patentes = orden.orden_autos?.map(oa => oa.autos?.patente).join(', ') || 'S/D';
            const isZebra = index % 2 !== 0; 
            const folioNumber = orden.folio || orden.id.slice(0,6).toUpperCase();
            const isPagado = orden.estado_pago === 'Pagado';

            return (
              <View key={index} style={[styles.tableRow, isZebra ? styles.tableRowZebra : {}]} wrap={false}>
                <Text style={[styles.col1, styles.tdText]}>{new Date(orden.created_at).toLocaleDateString('es-CL')}</Text>
                <Text style={[styles.col2, styles.tdText]}>#{folioNumber}</Text>
                <Text style={[styles.col3, styles.tdBold]}>{patentes}</Text>
                <Text style={[styles.col4, isPagado ? styles.badgePagado : styles.badgePendiente]}>
                  {isPagado ? 'PAGADO' : 'PENDIENTE'}
                </Text>
                <Text style={[styles.col5, styles.tdBold]}>{money(orden.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* GRAN TOTAL */}
        <View style={styles.summaryContainer} wrap={false}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              {/* Texto simplificado para asegurar que no choque con el número */}
              <Text style={styles.totalLabel}>TOTAL INVERTIDO</Text> 
              <Text style={styles.totalValue}>{money(totalGastado)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text>Reporte de transparencia generado automáticamente por la plataforma de gestión técnica Multifrenos.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} style={{ marginTop: 3, fontSize: 6, fontWeight: 'bold' }} />
        </View>

      </Page>
    </Document>
  );
};

export default ReporteGastosPDF;