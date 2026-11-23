# language: es
Característica: Recordatorios de pago
  Como usuario
  Quiero que la app me recuerde pagos
  Para no pagar intereses ni multas

  Antecedentes:
    Dado que inicié sesión

  Esquema del escenario: Crear un recordatorio
    Cuando abro "Nuevo Recordatorio"
    Y ingreso la descripción "Arriendo", el monto 1.200.000 y una fecha
    Y elijo la frecuencia "<frecuencia>"
    Y guardo
    Entonces veo "Arriendo" entre los recordatorios pendientes
    Y recibo una notificación en la fecha del recordatorio

    Ejemplos:
      | frecuencia |
      | Una vez    |
      | Semanal    |
      | Quincenal  |
      | Mensual    |
      | Anual      |

  Esquema del escenario: Validaciones del recordatorio
    Cuando creo un recordatorio con descripción "<descripcion>" y monto "<monto>"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | descripcion | monto   | mensaje                         |
      |             | 1200000 | La descripción es obligatoria.  |
      | Arriendo    | 0       | El monto debe ser mayor a 0.    |

  Escenario: Marcar un recordatorio como pagado
    Dado que tengo el recordatorio "Arriendo" de $1.200.000
    Cuando lo marco como pagado desde "Bancolombia"
    Entonces se registra un gasto de $1.200.000 en "Bancolombia"
    Y el recordatorio queda pagado

  Escenario: Recordatorio recurrente genera el siguiente
    Dado que tengo el recordatorio mensual "Arriendo" para el 5 de noviembre
    Cuando lo marco como pagado
    Entonces se crea el siguiente para el 5 de diciembre

  Escenario: Recordatorios vencidos
    Dado que tengo un recordatorio con fecha pasada sin pagar
    Entonces aparece como vencido
