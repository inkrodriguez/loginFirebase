// src/utils/timeSlots.js

export function gerarHorarios(horaInicio, horaFim) {
  const [inicioHora, inicioMinuto] = horaInicio.split(":").map(Number);
  const [fimHora, fimMinuto] = horaFim.split(":").map(Number);

  const horarios = [];
  let horaAtual = new Date();
  horaAtual.setHours(inicioHora, inicioMinuto, 0, 0);

  const horaFinal = new Date();
  horaFinal.setHours(fimHora, fimMinuto, 0, 0);

  while (horaAtual < horaFinal) {
    const horaFormatada = horaAtual
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      .padStart(5, "0");
    horarios.push(horaFormatada);

    horaAtual.setMinutes(horaAtual.getMinutes() + 60); // incrementa 1h
  }

  return horarios;
}
