import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1, // Ocupa toda a tela
    backgroundColor: "black",
    justifyContent: "center", // Centraliza verticalmente
    alignItems: "center", // Centraliza horizontalmente
    padding: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
      color:'#ffffff',
    marginVertical: 10,
    borderRadius: 6,
    width: "100%",
  },
  button: {
    backgroundColor: "#9B111E",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
    width: "48%",
  },
    buttonLoja: {
    backgroundColor: "#9B111E",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  buttonLogout: {
    backgroundColor: "red",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  textButton: {
    color:"#ffffff",
    fontWeight: "bold",
  },
  welcome: {
    fontSize: 18,
    marginBottom: 20,
  },
  logo: {
    width: 280,
    height: 120,
    alignSelf:'center',
    marginBottom: 20,
    resizeMode: "contain", // <-- Isso mantém a proporção e evita cortes
  },
  boxLogin: {
    width: "100%",
    maxWidth: 350, // limita a largura máxima
  },
buttonRow: {
  flexDirection: "row",
  justifyContent: "space-between", // mantém distribuição, mas pode ser opcional
  gap: 10, // <-- remove o espaçamento
}

});
