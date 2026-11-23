# language: es
Característica: Autenticación
  Como persona que quiere organizar sus finanzas
  Quiero registrarme e iniciar sesión en Planify
  Para acceder a mis datos de forma segura

  Antecedentes:
    Dado que estoy en la pantalla de inicio de Planify

  Escenario: Registro exitoso con correo y contraseña
    Cuando voy a "Crear mi cuenta gratis"
    Y ingreso el correo "ana@ejemplo.com"
    Y ingreso la contraseña "Segura123" y la confirmo
    Y pulso "Crear cuenta"
    Entonces se crea mi cuenta
    Y veo el onboarding

  Esquema del escenario: Validaciones del registro
    Cuando voy a "Crear mi cuenta gratis"
    Y ingreso el correo "<correo>"
    Y ingreso la contraseña "<clave>" y la confirmación "<confirmacion>"
    Y pulso "Crear cuenta"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | correo          | clave     | confirmacion | mensaje                                             |
      |                 | Segura123 | Segura123    | El correo electrónico es obligatorio.               |
      | ana@            | Segura123 | Segura123    | El formato del correo electrónico no es válido.     |
      | ana@ejemplo.com |           |              | La contraseña es obligatoria.                       |
      | ana@ejemplo.com | corta     | corta        | La contraseña debe tener al menos 8 caracteres.     |
      | ana@ejemplo.com | Segura123 | Otra1234     | Las contraseñas no coinciden.                       |

  Escenario: Inicio de sesión exitoso
    Dado que tengo una cuenta registrada con "ana@ejemplo.com"
    Cuando inicio sesión con mi correo y contraseña correctos
    Entonces veo el dashboard

  Esquema del escenario: Validaciones del inicio de sesión
    Cuando voy a "Iniciar sesión"
    Y ingreso el correo "<correo>" y la contraseña "<clave>"
    Y pulso "Iniciar Sesión"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | correo          | clave     | mensaje                                |
      |                 | Segura123 | El correo electrónico es obligatorio.  |
      | ana@ejemplo.com |           | La contraseña es obligatoria.          |

  Escenario: Bloqueo tras 3 intentos fallidos
    Dado que tengo una cuenta registrada con "ana@ejemplo.com"
    Cuando intento iniciar sesión 3 veces con una contraseña incorrecta
    Y vuelvo a intentarlo
    Entonces veo el error "Cuenta bloqueada por demasiados intentos fallidos. Intenta en 5 minutos."

  Escenario: El bloqueo expira a los 5 minutos
    Dado que mi cuenta está bloqueada por intentos fallidos
    Cuando pasan 5 minutos
    Y inicio sesión con mi correo y contraseña correctos
    Entonces veo el dashboard

  Escenario: Inicio de sesión con Google
    Cuando pulso "Continuar con Google"
    Y autorizo el acceso en Google
    Entonces veo el dashboard

  Esquema del escenario: Recuperar contraseña
    Cuando voy a "¿Olvidaste tu contraseña?"
    Y ingreso el correo "<correo>"
    Y solicito el enlace de recuperación
    Entonces <resultado>

    Ejemplos:
      | correo          | resultado                                                          |
      | ana@ejemplo.com | se me indica que revise mi correo                                  |
      |                 | veo el error "El correo electrónico es obligatorio."               |
      | ana@            | veo el error "El formato del correo electrónico no es válido."     |

  Escenario: Cerrar sesión
    Dado que inicié sesión
    Cuando voy a Ajustes y pulso "Cerrar sesión"
    Y confirmo
    Entonces vuelvo a la pantalla de inicio
