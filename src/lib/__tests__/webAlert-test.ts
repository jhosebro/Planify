import { webAlert } from '../webAlert';

describe('webAlert', () => {
  beforeEach(() => {
    (global as any).window = global.window ?? {};
    window.alert = jest.fn();
    window.confirm = jest.fn();
  });

  it('muestra un mensaje simple con window.alert', () => {
    webAlert('Error', 'El nombre es obligatorio.');
    expect(window.alert).toHaveBeenCalledWith('Error\n\nEl nombre es obligatorio.');
  });

  it('ejecuta el único botón tras el alert', () => {
    const onPress = jest.fn();
    webAlert('Éxito', 'Listo', [{ text: 'OK', onPress }]);
    expect(onPress).toHaveBeenCalled();
  });

  it('confirma y ejecuta la acción', () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    const onOk = jest.fn();
    const onCancel = jest.fn();
    webAlert('Eliminar', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel', onPress: onCancel }, { text: 'Eliminar', onPress: onOk }]);
    expect(onOk).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancela y no ejecuta la acción', () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const onOk = jest.fn();
    webAlert('Eliminar', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', onPress: onOk }]);
    expect(onOk).not.toHaveBeenCalled();
  });
});
