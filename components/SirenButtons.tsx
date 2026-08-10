import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";

export function SirenButtons({ onCancel, onSave, cancelText = "Cancel", saveText = "Save" }: { onCancel: () => void; onSave: () => void; cancelText?: string; saveText?: string }) {
  const blinkAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.btn, { backgroundColor: "#FF0000", opacity: blinkAnim }]}>
        <TouchableOpacity onPress={onCancel} style={styles.touch}>
          <Text style={styles.cancelTxt}>{cancelText}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[styles.btn, { backgroundColor: "#00FF00", opacity: blinkAnim }]}>
        <TouchableOpacity onPress={onSave} style={styles.touch}>
          <Text style={styles.saveTxt}>{saveText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: "center", justifyContent: "center", elevation: 4 },
  touch: { width: "100%", alignItems: "center" },
  cancelTxt: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  saveTxt: { color: "#000000", fontWeight: "bold", fontSize: 16 }
});
