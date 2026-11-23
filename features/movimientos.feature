# language: es
Característica: Movimientos (ingresos y gastos)
  Como usuario
  Quiero registrar ingresos y gastos
  Para saber en qué se va mi dinero

  Antecedentes:
    Dado que inicié sesión
    Y tengo la cuenta "Bancolombia" con saldo $1.000.000

  Escenario: Registrar un gasto
    Cuando abro "Nuevo Movimiento"
    Y elijo el tipo "Gasto"
    Y ingreso el monto 50.000
    Y elijo la cuenta "Bancolombia" y la categoría "Mercado"
    Y guardo
    Entonces el movimiento aparece en la lista
    Y el saldo de "Bancolombia" es $950.000

  Escenario: Registrar un ingreso
    Cuando registro un ingreso de 3.500.000 en "Bancolombia" con la categoría "Salario"
    Entonces el saldo de "Bancolombia" es $4.500.000

  Esquema del escenario: Validaciones del movimiento
    Cuando abro "Nuevo Movimiento"
    Y dejo <campo> sin completar
    Y guardo
    Entonces veo el error "<mensaje>"
    Y el movimiento no se guarda

    Ejemplos:
      | campo             | mensaje                            |
      | el monto          | El monto debe ser mayor a cero.    |
      | la cuenta         | Debes seleccionar una cuenta.      |
      | la categoría      | Debes seleccionar una categoría.   |

  Escenario: Editar un movimiento
    Dado que tengo un gasto de $50.000
    Cuando lo edito a $60.000
    Entonces el saldo de la cuenta se ajusta en -$10.000

  Escenario: Eliminar un movimiento
    Dado que tengo un gasto de $50.000
    Cuando lo elimino y confirmo
    Entonces desaparece de la lista
    Y el saldo de la cuenta recupera $50.000

  Escenario: Filtrar movimientos
    Dado que tengo ingresos y gastos registrados
    Cuando filtro por tipo, cuenta o categoría
    Entonces solo veo los movimientos que cumplen el filtro
