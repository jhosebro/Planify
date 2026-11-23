# language: es
Característica: Reportes y exportación
  Como usuario
  Quiero generar reportes y exportar mis datos
  Para analizarlos o compartirlos

  Antecedentes:
    Dado que inicié sesión

  Escenario: Generar un reporte PDF
    Cuando abro "Generar Reporte"
    Y elijo un rango de fechas válido, y opcionalmente una cuenta y una categoría
    Y genero el reporte
    Entonces puedo guardarlo o compartirlo

  Esquema del escenario: Validaciones del rango de fechas
    Cuando genero un reporte desde "<desde>" hasta "<hasta>"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | desde      | hasta      | mensaje                                                          |
      |            |            | Debes seleccionar un rango de fechas.                            |
      | 2026-13-40 | 2026-11-01 | Las fechas ingresadas no son válidas. Usa formato AAAA-MM-DD.    |
      | 2026-11-30 | 2026-11-01 | La fecha inicial no puede ser posterior a la fecha final.        |

  Escenario: Reporte en web con ventanas emergentes bloqueadas
    Dado que uso la versión web con popups bloqueados
    Cuando genero un reporte
    Entonces veo el error "No se pudo abrir la ventana de impresión. Desbloquea popups."

  Escenario: Exportar para ChatGPT
    Cuando abro "Exportar para ChatGPT"
    Y genero la exportación
    Entonces obtengo mis datos financieros en un formato para pegar en un asistente de IA

  Escenario: Dashboard
    Cuando abro el dashboard
    Entonces veo el saldo total, los gastos por categoría y la tendencia mensual
    Y puedo filtrar por "Este mes", "3 meses" o "6 meses"
