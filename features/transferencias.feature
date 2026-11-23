# language: es
Característica: Transferencias entre cuentas
  Como usuario
  Quiero mover dinero entre mis cuentas
  Para reflejar pagos de tarjeta, retiros o ahorros

  Antecedentes:
    Dado que inicié sesión
    Y tengo "Bancolombia" con $1.000.000 y "Efectivo" con $0

  Escenario: Transferencia exitosa
    Cuando transfiero $200.000 de "Bancolombia" a "Efectivo"
    Entonces "Bancolombia" queda con $800.000
    Y "Efectivo" queda con $200.000

  Esquema del escenario: Validaciones de la transferencia
    Cuando abro "Nueva Transferencia"
    Y <accion>
    Y confirmo la transferencia
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | accion                                       | mensaje                                         |
      | no ingreso monto                             | El monto debe ser mayor a cero.                 |
      | no elijo cuenta origen                       | Debes seleccionar una cuenta origen.            |
      | no elijo cuenta destino                      | Debes seleccionar una cuenta destino.           |
      | elijo la misma cuenta como origen y destino  | La cuenta origen y destino deben ser diferentes.|

  Escenario: Advertencia por saldo insuficiente
    Cuando transfiero $2.000.000 de "Bancolombia" a "Efectivo"
    Entonces veo la advertencia "La cuenta origen no tiene saldo suficiente. ¿Deseas continuar de todas formas?"
    Y si cancelo, no se hace la transferencia
    Y si continúo, la transferencia se registra

  Escenario: Eliminar una transferencia revierte ambos saldos
    Dado que transferí $200.000 de "Bancolombia" a "Efectivo"
    Cuando elimino esa transferencia
    Entonces "Bancolombia" vuelve a $1.000.000
    Y "Efectivo" vuelve a $0
