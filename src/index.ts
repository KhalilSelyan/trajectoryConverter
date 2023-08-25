import { Color, SceneUpdate, TriangleListPrimitive } from "@foxglove/schemas";
import { Duration } from "@foxglove/schemas/schemas/typescript/Duration";
import { Pose } from "@foxglove/schemas/schemas/typescript/Pose";
import { Time } from "@foxglove/schemas/schemas/typescript/Time";
import { ExtensionContext } from "@foxglove/studio";
import { setColorDependsOnVelocity } from "./utils";

interface TrajectoryPoint {
  /**
   * @description Representation of a trajectory point for the controller
   */
  time_from_start: Duration;
  pose: Pose;
  longitudinal_velocity_mps: number;
  lateral_velocity_mps: number;
  heading_rate_rps: number;
  acceleration_mps2: number;
  front_wheel_angle_rad: number;
  rear_wheel_angle_rad: number;
}

interface Trajectory {
  /**
   * @description A set of trajectory points for the controller
   */
  header: {
    stamp: Time;
    frame_id: string;
  };
  points: TrajectoryPoint[];
}

function quadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
) {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
  return { x, y };
}
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_planning_msgs/msg/Trajectory",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (msg: Trajectory): SceneUpdate => {
      const { points } = msg;
      const colors: Color[] = [];

      const triangleList: TriangleListPrimitive = {
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: [],
        color: { r: 1, g: 0, b: 1, a: 1 },
        colors,
        indices: [],
      };

      const width = 2; // Rectangle's half-width

      for (let i = 0; i < points.length - 2; i += 1) {
        const p0 = points[i]!.pose.position; // Start point
        const p1 = points[i + 1]?.pose.position ?? p0; // Control point
        const p2 = points[i + 2]?.pose.position ?? p1; // End point

        for (let t = 0; t < 1; t += 0.1) {
          const t1 = t;
          const t2 = t + 0.1;

          const point1 = quadraticBezier(p0, p1, p2, t1);
          const point2 = quadraticBezier(p0, p1, p2, t2);

          // Calculate the direction of the curve
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = (dy / len) * width;
          const ny = (-dx / len) * width;

          triangleList.points.push(
            { x: point1.x + nx, y: point1.y + ny, z: p0.z + 0.15 },
            { x: point1.x - nx, y: point1.y - ny, z: p0.z + 0.15 },
            { x: point2.x + nx, y: point2.y + ny, z: p0.z + 0.15 },
            { x: point2.x - nx, y: point2.y - ny, z: p0.z + 0.15 },
          );

          colors.push(setColorDependsOnVelocity(3, points[i]!.longitudinal_velocity_mps));
          colors.push(
            setColorDependsOnVelocity(3, (points[i + 1] ?? points[i]!).longitudinal_velocity_mps),
          );

          const idx = triangleList.points.length - 4;
          triangleList.indices.push(idx, idx + 1, idx + 2, idx + 1, idx + 2, idx + 3);
        }
      }

      const sceneUpdate: SceneUpdate = {
        deletions: [],
        entities: [
          {
            id: "path",
            arrows: [],
            lines: [],
            cubes: [],
            spheres: [],
            cylinders: [],
            models: [],
            texts: [],
            triangles: [triangleList],
            timestamp: msg.header.stamp,
            frame_id: msg.header.frame_id,
            frame_locked: false,
            lifetime: {
              sec: 1,
              nsec: 0,
            },
            metadata: [],
          },
        ],
      };
      return sceneUpdate;
    },
  });
}
