import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/Multifrenos%20(1024%20x%201024%20px)%20(1024%20x%20500%20px)%20(2).png"

const styles = StyleSheet.create({
    page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#f1f5f9', paddingBottom: 15 },
    logo: { width: 150 }, // Solo width para que escale sin deformarse
    headerRight: { textAlign: 'right', justifyContent: 'center' },
    titleBox: { backgroundColor: '#1e293b', padding: '8 16', borderRadius: 6, marginBottom: 8 },
    titleText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
    folioText: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: 'bold' },

    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 4 },
    grid2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    col: { width: '48%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1 solid #f1f5f9' },
    label: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 3, fontWeight: 'bold' },
    value: { fontSize: 10, color: '#0f172a', fontWeight: 'bold', marginBottom: 6 },

    // CORRECCIÓN: Separación de borderRadius para evitar el error "Invalid border radius"
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginTop: 10
    },
    tableRow: { flexDirection: 'row', padding: '10 8', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    colName: { width: '60%', fontSize: 9, color: '#0f172a', fontWeight: 'bold' },
    colType: { width: '20%', fontSize: 7, color: '#64748b', textTransform: 'uppercase' },
    colPrice: { width: '20%', fontSize: 9, color: '#0f172a', textAlign: 'right', fontWeight: 'bold' },

    // Estilos para los insumos anidados
    subItemRow: { flexDirection: 'row', padding: '6 8 6 20', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    subItemName: { width: '60%', fontSize: 8, color: '#475569' },
    subItemType: { width: '20%', fontSize: 6, color: '#94a3b8', textTransform: 'uppercase' },
    subItemPrice: { width: '20%', fontSize: 8, color: '#64748b', textAlign: 'right' },

    totalsBox: { width: '45%', alignSelf: 'flex-end', marginTop: 20, backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, border: '1 solid #e2e8f0' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    totalLabel: { fontSize: 9, color: '#64748b' },
    totalValue: { fontSize: 10, color: '#0f172a', fontWeight: 'bold' },
    grandTotalLabel: { fontSize: 10, color: '#0f172a', fontWeight: 'bold', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
    grandTotalValue: { fontSize: 14, color: '#16a34a', fontWeight: 'bold', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#cbd5e1' },

    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
    footerText: { fontSize: 8, color: '#64748b', marginBottom: 3 },
    footerNote: { fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }
})

export default function CotizacionPDF({ cotizacion }) {
    const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)

    // Cálculos financieros
    const subtotal = cotizacion.detalles.reduce((sum, item) => sum + (Number(item.precio) || 0), 0)
    const impuesto = cotizacion.incluye_iva ? Math.round(subtotal * 0.19) : 0
    const total = subtotal + impuesto

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>

                {/* CABECERA */}
                <View style={styles.header}>
                    <Image src={LOGO_URL} style={styles.logo} />
                    <View style={styles.headerRight}>
                        <View style={styles.titleBox}>
                            <Text style={styles.titleText}>COTIZACIÓN</Text>
                        </View>
                        <Text style={styles.folioText}>Fecha: {new Date(cotizacion.created_at || Date.now()).toLocaleDateString('es-CL')}</Text>
                    </View>
                </View>

                {/* DATOS CLIENTE */}
                <Text style={styles.sectionTitle}>Datos del Cliente</Text>
                <View style={styles.grid2}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Cliente / Empresa</Text>
                        <Text style={styles.value}>{cotizacion.cliente_nombre || 'No especificado'}</Text>
                        <Text style={styles.label}>Teléfono de Contacto</Text>
                        <Text style={styles.value}>{cotizacion.cliente_telefono || 'No especificado'}</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Vehículo a intervenir</Text>
                        <Text style={styles.value}>{cotizacion.vehiculo_info || 'No especificado'}</Text>
                    </View>
                </View>

                {/* TABLA DE SERVICIOS */}
                <Text style={styles.sectionTitle}>Detalle del Presupuesto</Text>
                <View style={styles.tableHeader}>
                    <Text style={styles.colName}>DESCRIPCIÓN DEL ÍTEM</Text>
                    <Text style={styles.colType}>TIPO</Text>
                    <Text style={styles.colPrice}>VALOR</Text>
                </View>

                {cotizacion.detalles.map((item, index) => (
                    <React.Fragment key={index}>
                        {/* Fila Principal */}
                        <View style={styles.tableRow}>
                            <Text style={styles.colName}>{item.nombre}</Text>
                            <Text style={styles.colType}>{item.tipo}</Text>
                            <Text style={styles.colPrice}>{money(item.precio)}</Text>
                        </View>

                        {/* Filas Secundarias (Insumos Anidados) */}
                        {item.insumos_anidados && item.insumos_anidados.length > 0 && item.insumos_anidados.map((insumo, subIdx) => (
                            <View key={`sub-${subIdx}`} style={styles.subItemRow}>
                                <Text style={styles.subItemName}>  ↳ Incluye: {insumo.nombre}</Text>
                                <Text style={styles.subItemType}>{insumo.referencia_id === 'manual' ? 'Libre' : 'Bodega'}</Text>
                                <Text style={styles.subItemPrice}>+ {money(insumo.precio)}</Text>
                            </View>
                        ))}
                    </React.Fragment>
                ))}

                {/* TOTALES */}
                <View style={styles.totalsBox}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal Neto:</Text>
                        <Text style={styles.totalValue}>{money(subtotal)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>IVA (19%):</Text>
                        <Text style={styles.totalValue}>{cotizacion.incluye_iva ? money(impuesto) : '$ 0'}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.grandTotalLabel}>TOTAL ESTIMADO:</Text>
                        <Text style={styles.grandTotalValue}>{money(total)}</Text>
                    </View>
                </View>

                {/* PIE DE PÁGINA */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Taller Automotriz Multifrenos SPA</Text>
                    <Text style={styles.footerText}>Frankfort 5030, San Miguel, Santiago | (+56) 9 8776 3347 | multifrenosspa@gmail.com</Text>
                    <Text style={styles.footerNote}>* Los valores de esta cotización son referenciales y están sujetos a una evaluación física del vehículo en el taller.</Text>
                </View>

            </Page>
        </Document>
    )
}