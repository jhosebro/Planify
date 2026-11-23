# language: es
Característica: Listas de seguimiento de compras
  Como usuario
  Quiero listas de productos que compro seguido
  Para saber qué necesito comprar y su impacto en el presupuesto

  Antecedentes:
    Dado que inicié sesión

  Escenario: Crear una lista
    Cuando abro "Nueva Lista de Seguimiento"
    Y ingreso el nombre "Mercado del mes", un ícono, un color y vinculo el presupuesto "Mercado"
    Y guardo
    Entonces veo la lista "Mercado del mes"

  Escenario: Lista sin nombre
    Cuando intento guardar una lista sin nombre
    Entonces veo el error "Ingresa un nombre para la lista"

  Escenario: Agregar un producto
    Dado que tengo la lista "Mercado del mes"
    Cuando agrego el producto "Café" con precio $25.000
    Y pulso "Agregar producto"
    Entonces "Café" aparece en la lista

  Escenario: Marcar que necesito comprar
    Dado que la lista tiene el producto "Café"
    Cuando lo marco como "por comprar"
    Entonces aparece entre los productos pendientes

  Escenario: Registrar la compra de un producto
    Dado que la lista "Mercado del mes" está vinculada al presupuesto "Mercado"
    Cuando registro la compra de "Café" desde "Bancolombia"
    Entonces se crea un gasto "Compra: Café" de $25.000
    Y "Café" deja de estar pendiente
    Y el consumo del presupuesto "Mercado" se actualiza

  Esquema del escenario: Compra sin datos requeridos
    Cuando registro la compra de "Café" sin <dato>
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | dato      | mensaje                                         |
      | cuenta    | Selecciona una cuenta para registrar el gasto   |
      | categoría | Selecciona una categoría para el movimiento     |

  Escenario: Eliminar un producto
    Cuando elimino "Café" y confirmo
    Entonces deja de aparecer en la lista
