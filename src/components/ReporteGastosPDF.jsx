import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/logo%202kx1k.png"; 

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#111', paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10, alignItems: 'center' },
  logoImage: { width: 180, height: 100, objectFit: 'contain' },
  meta: { textAlign: 'right' },
  metaTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a' },
  infoBox: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 10, marginBottom: 20 },
  infoLabel: { fontSize: 8, color: '#666', fontWeight: 'bold' },
  infoValue: { fontSize: 12, fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e3a8a', padding: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  th: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8, alignItems: 'center' },
  col1: { width: '20%' }, // Fecha
  col2: { width: '25%' }, // Folio
  col3: { width: '35%' }, // Vehículos
  col4: { width: '20%', textAlign: 'right' }, // Total
  totalBox: { marginTop: 20, alignSelf: 'flex-end', width: '40%', borderTopWidth: 2, borderTopColor: '#1e3a8a', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalText: { fontSize: 12, fontWeight: 'bold', color: '#1e3a8a' },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#666', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 }
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
            <Text style={{fontSize: 8, color: '#666'}}>Frankfort 5030, San Miguel</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>REPORTE DE GASTOS</Text>
            <Text style={{ marginTop: 4, fontSize: 9, color: '#666' }}>Emitido: {fechaHoy}</Text>
          </View>
        </View>

        {/* DATOS DEL CLIENTE / EMPRESA */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>CLIENTE / EMPRESA</Text>
          <Text style={styles.infoValue}>{cliente?.nombre}</Text>
          <Text style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
            RUT: {cliente?.rut || 'N/A'} | Tel: {cliente?.telefono || 'N/A'}
          </Text>
        </View>

        {/* TABLA DE ÓRDENES */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>FECHA</Text>
            <Text style={[styles.th, styles.col2]}>FOLIO ORDEN</Text>
            <Text style={[styles.th, styles.col3]}>VEHÍCULOS ASOCIADOS</Text>
            <Text style={[styles.th, styles.col4]}>MONTO</Text>
          </View>

          {ordenes?.length === 0 && (
            <Text style={{padding: 10, textAlign: 'center', fontSize: 10, color: '#666'}}>No hay historial de órdenes para este cliente.</Text>
          )}

          {ordenes?.map((orden, i) => {
            // Extraemos las patentes de esa orden específica
            const patentes = orden.orden_autos?.map(oa => oa.autos?.patente).join(', ') || 'S/D';
            
            return (
              <View key={i} style={styles.tableRow} wrap={false}>
                <Text style={[styles.col1, {fontSize: 9}]}>{new Date(orden.created_at).toLocaleDateString('es-CL')}</Text>
                <Text style={[styles.col2, {fontSize: 9, color: '#666'}]}>#{orden.id.slice(0,6).toUpperCase()}</Text>
                <Text style={[styles.col3, {fontSize: 9, fontWeight: 'bold'}]}>{patentes}</Text>
                <Text style={[styles.col4, {fontSize: 9, fontWeight: 'bold'}]}>{money(orden.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* GRAN TOTAL */}
        <View style={styles.totalBox} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>TOTAL ACUMULADO</Text>
            <Text style={styles.totalText}>{money(totalGastado)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text>Reporte generado automáticamente por el sistema de gestión Multifrenos.</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} style={{ marginTop: 2, fontSize: 6 }} />
        </View>

      </Page>
    </Document>
  );
};

export default ReporteGastosPDF;