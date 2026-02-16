import { t } from "../../../services/i18n";
import toast from "../../../services/toast";
import FormCheckbox from "../../react/FormCheckbox";
import FormGroup from "../../react/FormGroup";
import { useTriliumOption, useTriliumOptionBool } from "../../react/hooks";
import OptionsSection from "./components/OptionsSection";
import Admonition from "../../react/Admonition";
import FormSelect from "../../react/FormSelect";
import FormText from "../../react/FormText";

export default function CopilotSettings() {
    return (
        <>
            <EnableCopilotSettings />
            <CopilotConfiguration />
        </>
    );
}

function EnableCopilotSettings() {
    const [ copilotEnabled, setCopilotEnabled ] = useTriliumOptionBool("copilotEnabled");

    return (
        <OptionsSection title={t("copilot.title", "GitHub Copilot")}>
            <FormText>
                {t("copilot.description", "GitHub Copilot SDK integration provides AI-powered assistance for your notes. It can read, edit, and create notes across all note types with context-aware capabilities.")}
            </FormText>

            <FormGroup name="copilot-enabled" description={t("copilot.enable_description", "Enable GitHub Copilot integration to use AI features")}>
                <FormCheckbox
                    label={t("copilot.enable_label", "Enable GitHub Copilot")}
                    currentValue={copilotEnabled}
                    onChange={(isEnabled) => {
                        if (isEnabled) {
                            toast.showMessage(t("copilot.enabled_message", "GitHub Copilot enabled. The Copilot panel is now available in the right sidebar."));
                        } else {
                            toast.showMessage(t("copilot.disabled_message", "GitHub Copilot disabled"));
                        }

                        setCopilotEnabled(isEnabled);
                    }}
                />
            </FormGroup>

            {copilotEnabled && (
                <Admonition type="info">
                    {t("copilot.info_message", "After enabling Copilot, you can access the Copilot Assistant and Session Manager in the right panel. You can select text, add context notes, and use inline editing features.")}
                </Admonition>
            )}

            {!copilotEnabled && (
                <Admonition type="caution">
                    {t("copilot.disabled_warning", "GitHub Copilot is currently disabled. Enable it above to access AI-powered note assistance.")}
                </Admonition>
            )}
        </OptionsSection>
    );
}

function CopilotConfiguration() {
    const [ copilotEnabled ] = useTriliumOptionBool("copilotEnabled");
    const [ copilotModel, setCopilotModel ] = useTriliumOption("copilotModel");

    if (!copilotEnabled) {
        return null;
    }

    return (
        <OptionsSection title={t("copilot.configuration_title", "Copilot Configuration")}>
            <FormGroup 
                name="copilot-model" 
                label={t("copilot.model_label", "AI Model")} 
                description={t("copilot.model_description", "Select the AI model to use for GitHub Copilot. Different models have different capabilities and performance characteristics.")}
            >
                <FormSelect
                    values={[
                        { value: "gpt-5", text: "GPT-5 (Recommended)" },
                        { value: "gpt-4", text: "GPT-4" },
                        { value: "gpt-4-turbo", text: "GPT-4 Turbo" },
                        { value: "claude-sonnet", text: "Claude Sonnet" },
                        { value: "claude-opus", text: "Claude Opus" }
                    ]}
                    currentValue={copilotModel}
                    onChange={setCopilotModel}
                    keyProperty="value"
                    titleProperty="text"
                />
            </FormGroup>

            <FormText>
                {t("copilot.features_info", "Available features:")}
            </FormText>
            <ul>
                <li>{t("copilot.feature_1", "Universal AI assistant for all note types")}</li>
                <li>{t("copilot.feature_2", "Text selection auto-context")}</li>
                <li>{t("copilot.feature_3", "Context note selector")}</li>
                <li>{t("copilot.feature_4", "Inline editing with visual diff preview")}</li>
                <li>{t("copilot.feature_5", "Global session management")}</li>
                <li>{t("copilot.feature_6", "Support for Mermaid, Canvas, MindMap, and other visual notes")}</li>
            </ul>

            <Admonition type="note">
                {t("copilot.requirements", "Requirements: Node.js 24+ is required for GitHub Copilot SDK. Make sure you have the necessary API credentials configured.")}
            </Admonition>
        </OptionsSection>
    );
}
