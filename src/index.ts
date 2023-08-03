import { ExtensionContext } from "@foxglove/studio";
import { SceneUpdate, TriangleListPrimitive } from "@foxglove/schemas";
import { Duration } from "@foxglove/schemas/schemas/typescript/Duration";
import { Pose } from "@foxglove/schemas/schemas/typescript/Pose";
import { Time } from "@foxglove/schemas/schemas/typescript/Time";
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

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_planning_msgs/msg/Trajectory",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (msg: Trajectory): SceneUpdate => {
      const { points } = msg;

      const triangleList: TriangleListPrimitive = {
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: [],
        color: { r: 0, g: 0, b: 0, a: 0 },
        colors: [],
        indices: [],
      };

      const width = 1.25; // Rectangle's half-width

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;

        const color1 = setColorDependsOnVelocity(8.33, p1.longitudinal_velocity_mps);
        const color2 = setColorDependsOnVelocity(8.33, p2.longitudinal_velocity_mps);

        const direction = {
          x: p2.pose.position.x - p1.pose.position.x,
          y: p2.pose.position.y - p1.pose.position.y,
        };

        const normal = {
          x: -direction.y,
          y: direction.x,
        };

        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        normal.x /= length;
        normal.y /= length;

        const corners = [
          {
            x: p1.pose.position.x + normal.x * width,
            y: p1.pose.position.y + normal.y * width,
            z: p1.pose.position.z + 0.1,
          },
          {
            x: p1.pose.position.x - normal.x * width,
            y: p1.pose.position.y - normal.y * width,
            z: p1.pose.position.z + 0.1,
          },
          {
            x: p2.pose.position.x + normal.x * width,
            y: p2.pose.position.y + normal.y * width,
            z: p2.pose.position.z + 0.1,
          },
          {
            x: p2.pose.position.x - normal.x * width,
            y: p2.pose.position.y - normal.y * width,
            z: p2.pose.position.z + 0.1,
          },
        ];

        triangleList.points.push(...corners);
        triangleList.colors.push(color1, color1, color2, color2);

        triangleList.indices.push(0 + i * 4, 1 + i * 4, 2 + i * 4, 1 + i * 4, 2 + i * 4, 3 + i * 4);
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
