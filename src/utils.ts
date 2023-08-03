export function setColorDependsOnVelocity(vel_max: number, cmd_vel: number) {
  // Get absolute value of velocity
  const cmd_vel_abs = Math.abs(cmd_vel);
  const vel_min = 0.0;

  // Set color pointer
  let color = { r: 0, g: 0, b: 0, a: 1.0 };

  // If velocity is between vel_min and vel_max/2, set color from red to yellow
  if (vel_min < cmd_vel_abs && cmd_vel_abs <= vel_max / 2.0) {
    // Get ratio of velocity
    const ratio = (cmd_vel_abs - vel_min) / (vel_max / 2.0 - vel_min);
    // Set color
    color = gradation({ r: 1.0, g: 0, b: 0, a: 1.0 }, { r: 1.0, g: 1.0, b: 0, a: 1.0 }, ratio);
    // If velocity is between vel_max/2 and vel_max, set color from yellow to green
  } else if (vel_max / 2.0 < cmd_vel_abs && cmd_vel_abs <= vel_max) {
    // Get ratio of velocity
    const ratio = (cmd_vel_abs - vel_max / 2.0) / (vel_max - vel_max / 2.0);
    // Set color
    color = gradation({ r: 1.0, g: 1.0, b: 0, a: 1.0 }, { r: 0, g: 1.0, b: 0, a: 1.0 }, ratio);
    // If velocity is greater than vel_max, set color to green
  } else if (vel_max < cmd_vel_abs) {
    color = { r: 0, g: 1.0, b: 0, a: 1.0 };
    // If velocity is less than vel_min, set color to red
  } else {
    color = { r: 1.0, g: 0, b: 0, a: 1.0 };
  }

  return color;
}

function gradation(
  color_min: { r: number; g: number; b: number; a: number },
  color_max: { r: number; g: number; b: number; a: number },
  ratio: number,
): { r: number; g: number; b: number; a: number } {
  const color = { r: 0, g: 0, b: 0, a: 1.0 };
  color.r = color_max.r * ratio + color_min.r * (1.0 - ratio);
  color.g = color_max.g * ratio + color_min.g * (1.0 - ratio);
  color.b = color_max.b * ratio + color_min.b * (1.0 - ratio);
  color.a = 1.0; // Assuming full opacity. Adjust as needed.

  return color;
}
