import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  PDFDownloadLink,
  Image
} from "@react-pdf/renderer";

// 🎨 Fiori-styled
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    padding: 30,
    backgroundColor: "#fff",
    lineHeight: 1.4,
  },
  header: {
    backgroundColor: "#0a6ed1",
    color: "#fff",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 10,
  },
  invoiceInfo: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceBlock: {
    width: "48%",
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#0a6ed1",
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f3f8fc",
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableCell: {
    fontSize: 10,
  },
  zebraRow: {
    backgroundColor: "#fafafa",
  },
  totalBlock: {
    marginTop: 20,
    textAlign: "right",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0a6ed1",
  },
  footer: {
    marginTop: 30,
    fontSize: 9,
    textAlign: "center",
    color: "#777",
  },
});

// 📄 PDF dokument
const InvoiceDocument = ({ invoice, items }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        {/* Ako imaš logo */}
        {/* <Image src="/logo.png" style={styles.logo} /> */}
        <Text style={styles.companyTitle}>ZLATARNA KRIŽEK</Text>
        <Text style={styles.companyInfo}>
          Adresa, 10000 Zagreb | OIB 123456789 | www.krizek.hr
        </Text>
      </View>

      {/* Invoice info */}
      <View style={styles.invoiceInfo}>
        <View style={styles.invoiceBlock}>
          <Text style={styles.blockTitle}>Podaci tvrtke</Text>
          <Text>Zlatarna Križek d.o.o.</Text>
          <Text>Adresa: Ilica 123, Zagreb</Text>
          <Text>OIB: 123456789</Text>
        </View>
        <View style={styles.invoiceBlock}>
          <Text style={styles.blockTitle}>Podaci računa</Text>
          <Text>Račun: {invoice.invoice_no || invoice.id}</Text>
          <Text>Datum: {new Date(invoice.issued_at).toLocaleString("hr-HR")}</Text>
          <Text>Blagajnik: {invoice.cashier_id || "N/A"}</Text>
        </View>
      </View>

      {/* Tablica stavki */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Šifra</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Naziv</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Tip</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Količina</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Iznos</Text></View>
        </View>
        {items.map((it, idx) => (
          <View
            style={[
              styles.tableRow,
              idx % 2 === 0 ? styles.zebraRow : null,
            ]}
            key={it.id}
          >
            <View style={styles.tableCol}><Text style={styles.tableCell}>{it.item_code}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{it.items?.name}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{it.items?.type}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{it.quantity}</Text></View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {(it.price * it.quantity).toFixed(2)} €
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalBlock}>
        <Text style={styles.totalText}>
          Ukupno: {invoice.total?.toFixed(2)} €
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Hvala na kupnji! Vidimo se opet ❤️ | www.krizek.hr
      </Text>
    </Page>
  </Document>
);

// Wrapper za download link
export default function InvoicePrint({ invoice, items }) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument invoice={invoice} items={items} />}
      fileName={`Racun_${invoice.invoice_no || invoice.id}.pdf`}
    >
      {({ loading }) =>
        loading ? "Generiram PDF..." : "📄 Preuzmi račun (PDF)"
      }
    </PDFDownloadLink>
  );
}
